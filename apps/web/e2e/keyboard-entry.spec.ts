import { expect, test } from '@playwright/test'

/**
 * Phase 1 "keyboard-first desktop entry": the always-open inline row at the
 * top of the transaction register, split transactions (multiple category
 * legs balancing to one total), and the payee combobox's search-or-create
 * flow. See app/components/inline-transaction-row.tsx and
 * split-postings-editor.tsx.
 */

const PASSWORD = 'Sup3rSecret!pass'
const stamp = Date.now()
const EMAIL = `e2e-keyboard-${stamp}@example.com`

test('inline quick-add, split transactions, and the payee combobox', async ({ page }) => {
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

  await test.step('the command palette can jump straight to a new transaction', async () => {
    await page.goto('/transactions')
    await page.keyboard.press('Control+k')
    await page.getByText('Add transaction').click()
    await expect(page.getByRole('dialog', { name: 'Transaction' })).toBeVisible({
      timeout: 10_000,
    })
    await page.keyboard.press('Escape')
  })

  await test.step('the inline row creates a payee, and a transaction, without opening a dialog', async () => {
    await page.locator('input[type="number"]').first().fill('15.50')
    await page.getByRole('combobox', { name: 'Payee' }).first().click()
    await page.getByPlaceholder('Search or add a payee…').fill('Corner Cafe')
    await page.getByText('Add "Corner Cafe" as a new payee').click()
    await page.getByRole('combobox', { name: 'Category' }).first().click()
    await page.getByRole('option').first().click()
    await page.keyboard.press('Enter')

    await expect(page.getByText('Corner Cafe').first()).toBeVisible({ timeout: 30_000 })
  })

  await test.step('a split transaction divides one total across two categories', async () => {
    await page.getByRole('button', { name: 'Add Transaction' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Transaction' })
    await dialog.locator('#title').fill('Costco run')
    await dialog.locator('#amount').fill('100.00')
    await dialog.getByText('Split into multiple categories').click()

    // Scoped to the dialog: the register's always-on inline add row (see
    // transactions/index.tsx) has its own category combobox and amount
    // input, both otherwise indistinguishable from the dialog's. Every split
    // row's category combobox has the same static "Category" label (its
    // accessible name describes the field, not the current selection - see
    // the aria-label on SplitPostingsEditor's SelectTrigger), so a newly
    // added row - appended at the end - is the last match, not the first.
    // The dialog's number inputs, in DOM order, are: its own #amount, then
    // one per split row.
    const nextCategoryField = () => dialog.getByRole('combobox', { name: 'Category' }).last()
    const amountInputs = dialog.locator('input[type="number"]')

    await nextCategoryField().click()
    await page.getByRole('option').first().click()
    await amountInputs.nth(1).fill('60.00')

    await dialog.getByRole('button', { name: 'Add split' }).click()
    await nextCategoryField().click()
    await page.getByRole('option').nth(1).click()
    await amountInputs.nth(2).fill('40.00')

    await expect(dialog.getByText('Remaining to allocate: 0.00')).toBeVisible()
    await dialog.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Costco run').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Split \(2 categories\)/).first()).toBeVisible()
  })
})
