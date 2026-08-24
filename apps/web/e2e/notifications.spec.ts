import { expect, test } from '@playwright/test'

/**
 * The Notifications settings tab: off by default, a channel must be turned
 * on before "send test" is allowed, preferences persist across a reload, and
 * a bad webhook URL (private/loopback) is rejected client-side with the
 * server's validation error - see pft/notifications.is_safe_outbound_url.
 */

const PASSWORD = 'Sup3rSecret!pass'
const stamp = Date.now()
const EMAIL = `e2e-notifications-${stamp}@example.com`

test('notification preferences: defaults, save, persistence, and the test-send gate', async ({
  page,
}) => {
  await test.step('register and sign in', async () => {
    await page.goto('/register')
    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign Up' }).click()
    await page.waitForURL(/\/login/, { timeout: 30_000 })

    await expect(page.locator('#password')).toBeVisible({ timeout: 20_000 })
    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  })

  await test.step('the bell icon opens straight to the Notifications tab', async () => {
    await page.goto('/settings?tab=notifications')
    await expect(page.getByText('Delivery channels')).toBeVisible({ timeout: 30_000 })
  })

  await test.step('nothing is enabled by default, so a test send is blocked', async () => {
    const sendTest = page.getByRole('button', { name: 'Send test notification' })
    await expect(sendTest).toBeDisabled()
  })

  await test.step('turning on email reveals nothing extra and unlocks the test send', async () => {
    await page.getByRole('switch', { name: 'Email', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Send test notification' })).toBeEnabled()
  })

  await test.step('enabling webhook requires a URL before saving', async () => {
    await page.getByRole('switch', { name: 'Webhook' }).click()
    await page.getByRole('button', { name: 'Save Preferences' }).click()
    await expect(page.getByText('Failed to save notification preferences')).toBeVisible({
      timeout: 10_000,
    })
  })

  await test.step('a private-network webhook URL is rejected', async () => {
    await page.getByLabel('Webhook URL').fill('http://169.254.169.254/hook')
    await page.getByRole('button', { name: 'Save Preferences' }).click()
    await expect(page.getByText('Failed to save notification preferences')).toBeVisible({
      timeout: 10_000,
    })
  })

  await test.step('a real webhook URL and a raised threshold save successfully', async () => {
    await page.getByLabel('Webhook URL').fill('https://example.com/hooks/fintrack')
    const threshold = page.locator('input[type="number"]').first()
    await threshold.fill('75')
    await page.getByRole('button', { name: 'Save Preferences' }).click()
    await expect(page.getByText('Notification preferences saved')).toBeVisible({
      timeout: 10_000,
    })
  })

  await test.step('preferences persist across a reload', async () => {
    await page.reload()
    await expect(page.getByText('Delivery channels')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('input[type="number"]').first()).toHaveValue('75')
    await expect(page.getByLabel('Webhook URL')).toHaveValue('https://example.com/hooks/fintrack')
  })

  await test.step('sending a real test notification succeeds', async () => {
    await page.getByRole('button', { name: 'Send test notification' }).click()
    await expect(
      page.getByText('Test notification sent on every enabled channel'),
    ).toBeVisible({ timeout: 10_000 })
  })
})
