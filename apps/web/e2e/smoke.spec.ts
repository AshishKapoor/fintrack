import { expect, test } from '@playwright/test'

/**
 * The path a new self-hoster actually takes: register, sign in, add a
 * transaction, see it. If this breaks, the app is unusable regardless of what
 * the unit tests say.
 *
 * Runs against a real stack (`docker compose up -d`), so it exercises the nginx
 * proxy, the API and Postgres together rather than a mock.
 */

const PASSWORD = 'Sup3rSecret!pass'

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

test('the health endpoint is reachable through the proxy', async ({ request }) => {
  const response = await request.get('/healthz/')

  expect(response.ok()).toBeTruthy()
  expect(await response.json()).toMatchObject({ status: 'ok' })
})

test('an anonymous visitor is sent to the login page', async ({ page }) => {
  await page.goto('/transactions')

  // The route guard assigns window.location, so the redirect is a full reload.
  await page.waitForURL(/\/login/, { timeout: 20_000 })
  await expect(page.locator('#password')).toBeVisible({ timeout: 20_000 })
})

test('register, sign in, add a transaction, and see it listed', async ({ page }) => {
  const email = uniqueEmail()

  await test.step('register', async () => {
    await page.goto('/register')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign Up' }).click()
    // The form redirects to /login after a short delay on success.
    await page.waitForURL(/\/login/, { timeout: 30_000 })
  })

  await test.step('sign in', async () => {
    await expect(page.locator('#password')).toBeVisible({ timeout: 20_000 })
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  })

  await test.step('home shows the first-run start', async () => {
    // A brand-new account has no budget month and no entries, so Home offers
    // the two ways to begin instead of an empty month.
    await expect(page.getByRole('heading', { name: 'Your books start here' })).toBeVisible({
      timeout: 30_000,
    })
  })

  await test.step('add a transaction', async () => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: 'Add transaction' }).first().click()

    await page.locator('#title').fill('E2E coffee')
    await page.locator('#amount').fill('12.34')

    // Category is a Radix select, not a native one.
    await page.locator('#category').click()
    await page.getByRole('option').first().click()

    await page.getByRole('button', { name: 'Save' }).click()
  })

  await test.step('it appears in the list', async () => {
    await expect(page.getByText('E2E coffee').first()).toBeVisible({ timeout: 30_000 })
  })

  await test.step('home now lists the entry under today', async () => {
    await page.goto('/home')
    const recent = page.getByRole('region', { name: 'Today' })
    await expect(recent.getByText('E2E coffee')).toBeVisible({ timeout: 30_000 })
    // Regression: amounts once truncated to a 32-bit integer, dropping the cents.
    await expect(recent.getByText(/12\.34/)).toBeVisible({ timeout: 30_000 })
  })
})
