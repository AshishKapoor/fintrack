import { expect, test } from '@playwright/test'

/**
 * Insights page (see ROADMAP.md Phase 3): net worth over time,
 * month-over-month category comparison, and the cash flow Sankey. The
 * category panel is backed by the existing `compute_spending_trends`/
 * `report_type: "spending"` report; net worth and the Sankey are backed by
 * the new `compute_net_worth_series`/`compute_cash_flow_sankey`. Exact
 * figures are covered precisely by the backend test suite
 * (test_insights_reports.py) - this just proves the real stack wires a real
 * API response into a rendered page.
 */

const PASSWORD = 'Sup3rSecret!pass'

function uniqueEmail() {
  return `e2e-insights-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

async function addExpense(page: import('@playwright/test').Page, title: string, amount: string, category: string) {
  await page.goto('/transactions')
  await page.getByRole('button', { name: 'Add Transaction' }).first().click()
  await page.locator('#title').fill(title)
  await page.locator('#amount').fill(amount)
  await page.locator('#category').click()
  await page.getByRole('option', { name: category }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 })
}

test('insights shows an empty state, then a category breakdown once there is spending', async ({ page }) => {
  const email = uniqueEmail()

  await test.step('register and sign in', async () => {
    await page.goto('/register')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign Up' }).click()
    await page.waitForURL(/\/login/, { timeout: 30_000 })

    await expect(page.locator('#password')).toBeVisible({ timeout: 20_000 })
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  })

  await test.step('a fresh budget file has nothing to compare yet', async () => {
    await page.goto('/insights')
    // Net worth always has a well-defined value (a flat $0, here) even with
    // no transactions, so this panel renders its chart from the start -
    // unlike category spending, it has no empty state of its own to assert.
    await expect(page.getByText('Net worth over time')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('No spending to compare yet')).toBeVisible({ timeout: 30_000 })
    // Detection needs several charges spread months apart to see a pattern -
    // precisely backdating that many transactions isn't practical through
    // the calendar-popover date picker, so the detection algorithm itself
    // (regular interval + amount, excluding already-scheduled charges) is
    // covered precisely by the backend test suite instead; this only checks
    // the panel renders its empty state correctly with nothing to detect.
    await expect(page.getByText('No recurring charges detected yet')).toBeVisible()
  })

  await test.step('add expenses in two different categories', async () => {
    await addExpense(page, 'E2E weekly groceries', '64.50', 'Groceries')
    await addExpense(page, 'E2E train ticket', '18.00', 'Transportation')
  })

  await test.step('the chart panel breaks spending down by category', async () => {
    await page.goto('/insights')
    await expect(page.getByText('No spending to compare yet')).toHaveCount(0, { timeout: 30_000 })
    // Still renders correctly alongside the now-populated category panel -
    // exact post-expense figures are covered by the backend test suite.
    await expect(page.getByText('Net worth over time')).toBeVisible()
    // Two one-off charges are not a pattern - still correctly empty, not a
    // false positive.
    await expect(page.getByText('No recurring charges detected yet')).toBeVisible()
    // The legend renders each category's name as plain text - a real reading
    // of the API response, not just "some chart rendered".
    await expect(page.getByText('Groceries', { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Transportation', { exact: true })).toBeVisible()
  })

  await test.step('the table view carries the same categories and amounts', async () => {
    await page.getByRole('tab', { name: 'Table' }).click()
    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader', { name: 'Groceries' })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Transportation' })).toBeVisible()
    await expect(table.getByText(/64\.50/)).toBeVisible()
    await expect(table.getByText(/18\.00/)).toBeVisible()
  })

  await test.step('the cash flow diagram labels each node with its name and amount', async () => {
    // No income was recorded in this test, so both expenses are funded "From
    // savings" (the deficit-side gap node) rather than from a named income
    // category - still a real, valid graph, and the balancing logic itself
    // is covered precisely by the backend test suite.
    await expect(page.getByText('Cash flow')).toBeVisible()
    // Labels round to the nearest whole currency unit (maximumFractionDigits:
    // 0) - $64.50 rounds up to $65, not down, so this matches the real
    // rounding behavior rather than assuming truncation.
    await expect(page.getByText(/Groceries — \$65/)).toBeVisible()
    await expect(page.getByText(/Transportation — \$18/)).toBeVisible()
    await expect(page.getByText(/From savings — \$83/)).toBeVisible()
  })
})
