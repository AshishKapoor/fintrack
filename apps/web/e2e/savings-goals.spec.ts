import { expect, test } from '@playwright/test'

/**
 * Savings goals: create/edit/delete, and live progress tracking against an
 * account's real balance - ROADMAP.md Phase 3's "first-class savings goals"
 * (the four goal_* fields on EnvelopeAssignment were read/written but never
 * computed into progress anywhere; this is a real, persistent object with
 * its progress read straight off Account.current_balance).
 */

const PASSWORD = 'Sup3rSecret!pass'

function uniqueEmail() {
  return `e2e-goals-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

test('create a savings goal, watch its progress move with the account balance, then edit and delete it', async ({
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

  await test.step('a fresh budget file has no goals yet', async () => {
    await page.goto('/savings-goals')
    await expect(page.getByText('No savings goals yet')).toBeVisible({ timeout: 30_000 })
  })

  await test.step('create a goal against the seeded Cash account', async () => {
    await page.getByRole('button', { name: 'Add goal' }).first().click()
    await page.locator('#goal-name').fill('Emergency Fund')
    await page.locator('#goal-account').click()
    await page.getByRole('option', { name: 'Cash' }).click()
    await page.locator('#goal-target-amount').fill('1000')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Emergency Fund')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('$0.00')).toBeVisible()
    await expect(page.getByText(/of \$1,000\.00 \(0%\)/)).toBeVisible()
  })

  await test.step('adding an account transaction moves the goal toward its target', async () => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Add Transaction' }).first().click()
    await page.getByRole('radio', { name: /income/i }).click()
    await page.locator('#title').fill('Paycheck')
    await page.locator('#amount').fill('400')
    await page.locator('#category').click()
    await page.getByRole('option').first().click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Paycheck').first()).toBeVisible({ timeout: 30_000 })

    await page.goto('/savings-goals')
    await expect(page.getByText(/of \$1,000\.00 \(40%\)/)).toBeVisible({ timeout: 30_000 })
  })

  await test.step('editing keeps the goal linked to its progress', async () => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page.locator('#goal-name')).toHaveValue('Emergency Fund')
    await page.locator('#goal-name').fill('Emergency Fund (renamed)')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Emergency Fund (renamed)')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/of \$1,000\.00 \(40%\)/)).toBeVisible()
  })

  await test.step('delete asks for confirmation, then removes the goal', async () => {
    await page.getByRole('button', { name: 'Delete' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('No savings goals yet')).toBeVisible({ timeout: 30_000 })
  })
})
