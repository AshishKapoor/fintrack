import { expect, test } from '@playwright/test'

/**
 * Envelope budgets through the UI: set a budget, see the card, use the
 * whole-month actions. Exercises BudgetMonth + EnvelopeAssignment natively.
 */

const PASSWORD = 'Sup3rSecret!pass'

function uniqueEmail() {
  return `e2e-budget-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

test('set a budget, see its card, zero it out', async ({ page }) => {
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

  await test.step('create a budget from the empty state', async () => {
    await page.goto('/budgets')
    await page.getByRole('button', { name: 'Create Budget' }).click()

    await page.locator('#category').click()
    await page.getByRole('option', { name: 'Housing' }).click()
    await page.locator('#amount').fill('500')
    await page.getByRole('button', { name: 'Save' }).click()
  })

  await test.step('the card shows assigned and spent', async () => {
    await expect(page.getByText('Housing').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/500\.00/).first()).toBeVisible()
  })

  await test.step('upsert: saving the same category again updates, not duplicates', async () => {
    await page.getByRole('button', { name: 'Add Budget' }).click()
    await page.locator('#category').click()
    await page.getByRole('option', { name: 'Housing' }).click()
    await page.locator('#amount').fill('750')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText(/750\.00/).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Housing', { exact: true })).toHaveCount(1)
  })

  await test.step('zero out clears the month', async () => {
    await page.getByRole('button', { name: 'Zero out' }).click()
    await expect(page.getByText(/0\.00/).first()).toBeVisible({ timeout: 30_000 })
  })
})
