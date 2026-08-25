import { expect, test } from '@playwright/test'

/**
 * Opt-in AI categorization (ROADMAP.md Phase 3): off by default, a provider
 * (OpenAI-compatible or local Ollama) configured per budget file, an API key
 * stored separately from the rest of the settings since it's a credential.
 * A real provider round-trip needs live credentials this suite doesn't have,
 * so this covers the settings CRUD/toggle/save flow and the graceful
 * failure path when no provider is reachable - both fully real, both
 * exercised through the actual stack. The AI-suggestion-in-quick-add path
 * itself (source: 'ai' -> the "Suggested by AI" label) is covered by the
 * backend's SuggestedCategoryAiFallbackTests plus a manual network-mocked
 * browser check, since it likewise needs a real provider to exercise live.
 */

const PASSWORD = 'Sup3rSecret!pass'

function uniqueEmail() {
  return `e2e-ai-cat-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

test('AI categorization settings are off by default, configurable per provider, and persist', async ({
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

  await test.step('off by default, OpenAI-compatible fields hidden until enabled', async () => {
    await page.goto('/settings')
    await page.getByRole('tab', { name: 'AI Categorization' }).click()
    await expect(page.getByRole('switch', { name: 'Enable AI suggestions' })).not.toBeChecked({
      timeout: 20_000,
    })
    await expect(page.locator('#ai-provider')).toBeHidden()
  })

  await test.step('enabling reveals provider fields, defaulting to OpenAI-compatible with an API key field', async () => {
    await page.getByRole('switch', { name: 'Enable AI suggestions' }).click()
    await expect(page.locator('#ai-provider')).toBeVisible()
    await expect(page.locator('#ai-provider')).toHaveText('OpenAI-compatible (bring your own key)')
    await expect(page.locator('#ai-api-key')).toBeVisible()
    await expect(page.getByText("No key configured yet")).toBeVisible()
  })

  await test.step('switching to Ollama hides the API key field and swaps placeholders', async () => {
    await page.locator('#ai-provider').click()
    await page.getByRole('option', { name: 'Ollama (local)' }).click()
    await expect(page.locator('#ai-api-key')).toBeHidden()
    await expect(page.locator('#ai-base-url')).toHaveAttribute('placeholder', 'http://localhost:11434/v1')
    await expect(page.locator('#ai-model')).toHaveAttribute('placeholder', 'llama3.2')
  })

  await test.step('save persists across reload', async () => {
    await page.getByRole('button', { name: 'Save settings' }).click()
    await expect(page.getByText('AI categorization settings saved')).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await page.getByRole('tab', { name: 'AI Categorization' }).click()
    await expect(page.getByRole('switch', { name: 'Enable AI suggestions' })).toBeChecked({
      timeout: 20_000,
    })
    await expect(page.locator('#ai-provider')).toHaveText('Ollama (local)')
  })

  await test.step('testing an unreachable provider fails gracefully, not with a crash', async () => {
    await page.getByRole('button', { name: 'Test connection' }).click()
    await expect(page.getByText(/couldn't be reached|Failed to reach/i)).toBeVisible({ timeout: 15_000 })
  })

  await test.step('switching back to OpenAI-compatible, setting and clearing an API key', async () => {
    await page.locator('#ai-provider').click()
    await page.getByRole('option', { name: 'OpenAI-compatible (bring your own key)' }).click()
    await page.locator('#ai-api-key').fill('sk-test-fake-key-for-e2e')
    await page.getByRole('button', { name: 'Set', exact: true }).click()
    await expect(page.getByText('API key saved')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('A key is configured.')).toBeVisible()

    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.getByText('API key cleared')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("No key configured yet")).toBeVisible()
  })

  await test.step('disabling and saving turns it back off', async () => {
    await page.getByRole('switch', { name: 'Enable AI suggestions' }).click()
    await page.getByRole('button', { name: 'Save settings' }).click()
    await expect(page.getByText('AI categorization settings saved')).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await page.getByRole('tab', { name: 'AI Categorization' }).click()
    await expect(page.getByRole('switch', { name: 'Enable AI suggestions' })).not.toBeChecked({
      timeout: 20_000,
    })
  })
})
