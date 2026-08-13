import { expect, test } from '@playwright/test'

/**
 * The encrypted backup round trip, through the real stack:
 * add a transaction -> create a backup -> delete the transaction ->
 * restore -> the transaction is back. Also proves a wrong passphrase fails
 * closed rather than restoring garbage.
 */

const PASSWORD = 'Sup3rSecret!pass'
const PASSPHRASE = 'backup passphrase 42'

function uniqueEmail() {
  return `e2e-backup-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

test('back up, wipe, restore', async ({ page }) => {
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

  await test.step('add a transaction worth backing up', async () => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Add Transaction' }).first().click()
    await page.locator('#title').fill('Precious data')
    await page.locator('#amount').fill('99.99')
    await page.locator('#category').click()
    await page.getByRole('option').first().click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Precious data').first()).toBeVisible({ timeout: 30_000 })
  })

  await test.step('create an encrypted backup', async () => {
    await page.goto('/settings')
    await page.getByRole('tab', { name: 'Backups' }).click()
    await page.locator('#backup-passphrase').fill(PASSPHRASE)
    await page.locator('#backup-passphrase-confirm').fill(PASSPHRASE)
    await page.getByRole('button', { name: 'Create backup' }).click()
    await expect(page.getByText(/1 transaction/).first()).toBeVisible({ timeout: 30_000 })
  })

  await test.step('delete the transaction', async () => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Open menu' }).first().click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('button', { name: /delete/i }).last().click()
    await expect(page.getByText('Precious data')).toHaveCount(0, { timeout: 30_000 })
  })

  await test.step('a wrong passphrase fails closed', async () => {
    await page.goto('/settings')
    await page.getByRole('tab', { name: 'Backups' }).click()
    page.once('dialog', (dialog) => dialog.accept('not the passphrase'))
    await page.getByRole('button', { name: 'Restore' }).first().click()
    await expect(page.getByText(/wrong passphrase/i).first()).toBeVisible({ timeout: 30_000 })
  })

  await test.step('restore with the right passphrase', async () => {
    page.once('dialog', (dialog) => dialog.accept(PASSPHRASE))
    await page.getByRole('button', { name: 'Restore' }).first().click()
    await expect(page.getByText(/Restored 1 transaction/).first()).toBeVisible({
      timeout: 30_000,
    })
  })

  await test.step('the transaction is back', async () => {
    await page.goto('/transactions')
    await expect(page.getByText('Precious data').first()).toBeVisible({ timeout: 30_000 })
  })
})
