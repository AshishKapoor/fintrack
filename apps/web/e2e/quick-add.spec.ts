import { expect, test } from '@playwright/test'

/**
 * The mobile quick-capture screen: amount -> payee -> (suggested) category ->
 * done (ROADMAP.md Phase 1). Covers the learning loop specifically - a
 * second transaction for the same payee should arrive with its category
 * pre-filled from the first, per PayeeViewSet.suggested_category.
 */

const PASSWORD = 'Sup3rSecret!pass'
const stamp = Date.now()
const EMAIL = `e2e-quickadd-${stamp}@example.com`

test('quick add: amount, payee, suggested category, done', async ({ page }) => {
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

  await test.step('reachable from the sidebar', async () => {
    await page.getByRole('link', { name: 'Quick Add' }).click()
    await page.waitForURL(/\/quick-add/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible()
  })

  await test.step('first entry: no history yet, category is picked manually', async () => {
    await page.locator('#quick-add-amount').fill('4.50')
    await page.getByRole('combobox', { name: 'Payee' }).click()
    await page.getByPlaceholder('Search or add a payee…').fill('Corner Cafe')
    await page.getByText('Add "Corner Cafe" as a new payee').click()

    await page.locator('#quick-add-category').click()
    await page.getByRole('option').first().click()
    const chosenCategory = await page.locator('#quick-add-category').innerText()

    await page.getByRole('button', { name: 'Save transaction' }).click()
    await expect(page.getByText('Transaction saved')).toBeVisible({ timeout: 30_000 })

    // The form clears and refocuses the amount field, ready for the next entry.
    await expect(page.locator('#quick-add-amount')).toHaveValue('')
    await expect(page.locator('#quick-add-amount')).toBeFocused()

    await page.goto('/transactions')
    await expect(page.getByText('Corner Cafe').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(chosenCategory).first()).toBeVisible()
  })

  await test.step('second entry for the same payee arrives pre-categorised', async () => {
    await page.goto('/quick-add')
    await page.locator('#quick-add-amount').fill('6.25')
    await page.getByRole('combobox', { name: 'Payee' }).click()
    await page.getByPlaceholder('Search or add a payee…').fill('Corner Cafe')
    await page.getByRole('option', { name: 'Corner Cafe' }).click()

    await expect(page.getByText(/Suggested from your last Corner Cafe transaction/)).toBeVisible(
      { timeout: 10_000 },
    )
    await expect(page.getByRole('button', { name: 'Save transaction' })).toBeEnabled()

    await page.getByRole('button', { name: 'Save transaction' }).click()
    await expect(page.getByText('Transaction saved')).toBeVisible({ timeout: 30_000 })
  })
})
