import { expect, test } from '@playwright/test'

/**
 * Bank sync connect flow, as far as it goes without a real GoCardless/
 * SimpleFIN account to link - see docs/self-hosting.md#bank-sync. CI sets
 * neither GOCARDLESS_SECRET_ID/KEY, so GoCardless is expected to show as
 * unconfigured; SimpleFIN needs no instance-wide config, so its setup-token
 * step is reachable and testable even without a live bridge to claim
 * against.
 */

const PASSWORD = 'Sup3rSecret!pass'

function uniqueEmail() {
  return `e2e-banksync-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

test('connect-a-bank dialog: provider list and the SimpleFIN token step', async ({ page }) => {
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

  await test.step('Bank Sync tab starts empty', async () => {
    await page.goto('/accounts')
    await page.getByRole('tab', { name: 'Bank Sync' }).click()
    await expect(page.getByText('No bank connections yet.')).toBeVisible({ timeout: 30_000 })
  })

  await test.step('GoCardless is unconfigured on this instance; SimpleFIN is not', async () => {
    await page.getByRole('button', { name: 'Connect a bank' }).click()
    const goCardless = page.getByRole('button', { name: /GoCardless Bank Account Data/ })
    await expect(goCardless).toBeDisabled()
    await expect(goCardless).toContainText('Not configured on this instance yet')

    await expect(page.getByRole('button', { name: /SimpleFIN Bridge/ })).toBeEnabled()
  })

  await test.step('SimpleFIN asks for a setup token', async () => {
    await page.getByRole('button', { name: /SimpleFIN Bridge/ }).click()
    await expect(page.getByLabel('SimpleFIN setup token')).toBeVisible()

    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByRole('button', { name: /SimpleFIN Bridge/ })).toBeVisible()
  })
})
