import { expect, test } from '@playwright/test'

/**
 * Debt payoff planning (ROADMAP.md Phase 3): a credit/liability account with
 * an interest rate and minimum payment set on the Accounts page feeds a
 * snowball/avalanche projection on the Insights page. Exact month-by-month
 * arithmetic is covered precisely by the backend test suite
 * (test_debt_payoff.py, verified against a hand-simulation independent of
 * the implementation) - this proves the real stack wires an account's
 * fields into a rendered projection, and that changing the extra payment
 * actually changes the plan.
 */

const PASSWORD = 'Sup3rSecret!pass'

function uniqueEmail() {
  return `e2e-debt-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

test('a debt account with rate and minimum payment set produces a payoff plan that responds to extra payments', async ({
  page,
}) => {
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

  await test.step('a fresh budget file has no debts to plan around', async () => {
    await page.goto('/insights')
    await expect(page.getByText('No debts to plan around yet')).toBeVisible({ timeout: 30_000 })
  })

  await test.step('add a credit card with a balance but no rate or minimum yet', async () => {
    await page.goto('/accounts')
    await page.getByRole('button', { name: 'Add account' }).click()
    await page.locator('#account-name').fill('Visa Card')
    await page.locator('#account-type').click()
    await page.getByRole('option', { name: 'Credit Card' }).click()
    await page.locator('#account-opening-balance').fill('-2000')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('cell', { name: 'Visa Card' })).toBeVisible({ timeout: 30_000 })
  })

  await test.step('still excluded until an interest rate and minimum payment are set', async () => {
    await page.goto('/insights')
    await expect(page.getByText('No debts to plan around yet')).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByText('Add an interest rate and minimum payment to a credit or liability account'),
    ).toBeVisible()
  })

  await test.step('set the interest rate and minimum payment', async () => {
    await page.goto('/accounts')
    await page.getByRole('row', { name: /Visa Card/ }).getByRole('button', { name: 'Edit' }).click()
    await page.locator('#account-interest-rate').fill('22.99')
    await page.locator('#account-minimum-payment').fill('60')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Account updated')).toBeVisible({ timeout: 10_000 })
  })

  await test.step('the payoff plan now renders, and changing the strategy or extra payment updates it', async () => {
    await page.goto('/insights')
    await page.getByText('Debt payoff plan').scrollIntoViewIfNeeded()
    await expect(page.getByText(/Debt-free in \d+ months, paying/)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('cell', { name: 'Visa Card' })).toBeVisible()

    const summary = page.getByText(/Debt-free in \d+ months, paying/)
    const before = await summary.textContent()

    await page.locator('#debt-extra-payment').fill('200')
    await expect(async () => {
      const after = await summary.textContent()
      expect(after).not.toEqual(before)
    }).toPass({ timeout: 10_000 })
  })
})
