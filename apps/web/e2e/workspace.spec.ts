import { expect, test, type Page } from '@playwright/test'

/**
 * The tenancy arc through two real browsers: an owner creates a shared
 * workspace, invites a viewer by token, the viewer joins, sees the owner's
 * data, and is refused writes. Everything the four backend PRs claim,
 * observed from the outside.
 */

const PASSWORD = 'Sup3rSecret!pass'
const stamp = Date.now()
const OWNER = `e2e-owner-${stamp}@example.com`
const VIEWER = `e2e-viewer-${stamp}@example.com`

async function registerAndSignIn(page: Page, email: string) {
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
}

async function switchWorkspace(page: Page, name: string) {
  await page.getByRole('button', { name: /workspace|space/i }).first().click()
  await page.getByRole('menuitem', { name }).click()
}

test('owner shares a workspace; viewer reads but cannot write', async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  let token = ''

  await test.step('owner registers and creates a workspace', async () => {
    await registerAndSignIn(owner, OWNER)
    await owner.goto('/settings')
    await owner.getByRole('tab', { name: 'Workspace' }).click()
    await owner.locator('#workspace-name').fill('Shared Books')
    await owner.getByRole('button', { name: 'Create workspace' }).click()
    await expect(owner.getByText('Shared Books — members')).toBeVisible({ timeout: 30_000 })
  })

  await test.step('owner adds a transaction in the shared workspace', async () => {
    await owner.goto('/transactions')
    await owner.getByRole('button', { name: 'Add Transaction' }).first().click()
    await owner.locator('#title').fill('Team lunch')
    await owner.locator('#amount').fill('45.00')
    await owner.locator('#category').click()
    await owner.getByRole('option').first().click()
    await owner.getByRole('button', { name: 'Save' }).click()
    await expect(owner.getByText('Team lunch').first()).toBeVisible({ timeout: 30_000 })
  })

  await test.step('owner invites the viewer', async () => {
    await owner.goto('/settings')
    await owner.getByRole('tab', { name: 'Workspace' }).click()
    await owner.locator('#invite-email').fill(VIEWER)
    await owner.locator('#invite-role').click()
    await owner.getByRole('option', { name: 'viewer' }).click()
    await owner.getByRole('button', { name: 'Invite' }).click()
    const tokenBox = owner.getByTestId('invite-token')
    await expect(tokenBox).toBeVisible({ timeout: 30_000 })
    token = (await tokenBox.textContent())?.trim() ?? ''
    expect(token.length).toBeGreaterThan(20)
  })

  const viewerContext = await browser.newContext()
  const viewer = await viewerContext.newPage()

  await test.step('viewer joins with the token and switches in', async () => {
    await registerAndSignIn(viewer, VIEWER)
    await viewer.goto('/settings')
    await viewer.getByRole('tab', { name: 'Workspace' }).click()
    await viewer.locator('#join-token').fill(token)
    await viewer.getByRole('button', { name: 'Join' }).click()
    await expect(viewer.getByText('Joined the workspace').first()).toBeVisible({
      timeout: 30_000,
    })
    await switchWorkspace(viewer, 'Shared Books')
  })

  await test.step("viewer sees the owner's transaction", async () => {
    await viewer.goto('/transactions')
    await expect(viewer.getByText('Team lunch').first()).toBeVisible({ timeout: 30_000 })
  })

  await test.step('viewer cannot write', async () => {
    await viewer.getByRole('button', { name: 'Add Transaction' }).first().click()
    await viewer.locator('#title').fill('Trespass')
    await viewer.locator('#amount').fill('1.00')
    await viewer.locator('#category').click()
    await viewer.getByRole('option').first().click()
    await viewer.getByRole('button', { name: 'Save' }).click()
    await expect(viewer.getByText(/failed to create transaction/i).first()).toBeVisible({
      timeout: 30_000,
    })
    await viewer.keyboard.press('Escape')
    await expect(viewer.getByText('Trespass')).toHaveCount(0)
  })

  await ownerContext.close()
  await viewerContext.close()
})
