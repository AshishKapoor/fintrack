import { expect, test } from '@playwright/test'

/**
 * Bank statement import.
 *
 * The parsers have existed in the API since the finance domain landed, but no
 * UI ever called them. This drives the whole three-step flow against a real
 * stack: upload, preview what was parsed, then import.
 */

const PASSWORD = 'Sup3rSecret!pass'

const CSV = `date,payee,memo,amount
2026-03-01,Acme Corp,March salary,4200.00
2026-03-03,Green Grocer,Weekly shop,-82.45
2026-03-07,Metro Transit,Monthly pass,-55.00
`

function uniqueEmail() {
  return `e2e-import-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

test('import a CSV statement and see the transactions appear', async ({ page }) => {
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

  await test.step('open the importer from the empty state', async () => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: /import/i }).first().click()
    await expect(page.getByRole('heading', { name: 'Import transactions' })).toBeVisible()
  })

  await test.step('upload the statement', async () => {
    await page.locator('#import-file').setInputFiles({
      name: 'march-statement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV),
    })
    await page.getByRole('button', { name: 'Preview' }).click()
  })

  await test.step('the preview reports what was parsed', async () => {
    await expect(page.getByText(/Found\s+3\s+transaction/)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Acme Corp')).toBeVisible()
    await expect(page.getByText('Green Grocer')).toBeVisible()
  })

  await test.step('import them', async () => {
    await page.getByRole('button', { name: /^Import 3$/ }).click()
    await expect(page.getByText(/Imported 3 transaction/)).toBeVisible({ timeout: 30_000 })
  })

  await test.step('they show up in the list', async () => {
    await expect(page.getByText('March salary').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Weekly shop').first()).toBeVisible()
  })
})
