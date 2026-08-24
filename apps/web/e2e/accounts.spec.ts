import { expect, test } from '@playwright/test'

/**
 * Accounts page: create/edit/archive/delete, and per-account currency - see
 * ROADMAP.md Phase 2's "Real multi-currency" (today currency was
 * display-only; this is what makes it real).
 */

const PASSWORD = 'Sup3rSecret!pass'

function uniqueEmail() {
  return `e2e-accounts-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

test('create an account with its own currency, edit it, archive it, delete it', async ({ page }) => {
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

  await test.step('the signup-seeded Cash account is already there, in USD', async () => {
    await page.goto('/accounts')
    await expect(page.getByRole('cell', { name: 'Cash', exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('row', { name: /Cash/ })).toContainText('USD')
  })

  await test.step('add a EUR account', async () => {
    await page.getByRole('button', { name: 'Add account' }).click()
    await page.locator('#account-name').fill('Euro Travel Fund')
    await page.locator('#account-opening-balance').fill('500')
    await page.locator('#account-currency').click()
    await page.getByRole('option', { name: /EUR/ }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    const row = page.getByRole('row', { name: /Euro Travel Fund/ })
    await expect(row).toBeVisible({ timeout: 30_000 })
    await expect(row).toContainText('EUR')
    await expect(row).toContainText('€500.00')
  })

  await test.step('editing keeps the account in its own currency', async () => {
    const row = page.getByRole('row', { name: /Euro Travel Fund/ })
    await row.getByRole('button', { name: 'Edit' }).click()
    await expect(page.locator('#account-name')).toHaveValue('Euro Travel Fund')
    await page.locator('#account-name').fill('Europe Trip Fund')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('row', { name: /Europe Trip Fund/ })).toContainText('EUR')
  })

  await test.step('archiving dims the row without deleting it', async () => {
    const row = page.getByRole('row', { name: /Europe Trip Fund/ })
    await row.getByRole('button', { name: 'Archive' }).click()
    await expect(row.getByRole('button', { name: 'Unarchive' })).toBeVisible({ timeout: 30_000 })
  })

  await test.step('delete asks for confirmation, then removes the account', async () => {
    const row = page.getByRole('row', { name: /Europe Trip Fund/ })
    await row.getByRole('button', { name: 'Delete' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('Europe Trip Fund')).toHaveCount(0, { timeout: 30_000 })
  })
})
