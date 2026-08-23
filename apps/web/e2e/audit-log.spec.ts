import { expect, test, type Page } from '@playwright/test'

/**
 * The audit log through two real browsers: an owner's actions in a shared
 * workspace show up on the audit log page, filters narrow them, and a plain
 * member - who the API silently shows nothing to, see audit_views.py - gets
 * neither the sidebar link nor a confusing empty screen, just a clear reason.
 */

const PASSWORD = 'Sup3rSecret!pass'
const stamp = Date.now()
const OWNER = `e2e-audit-owner-${stamp}@example.com`
const MEMBER = `e2e-audit-member-${stamp}@example.com`
const WORKSPACE = `Audit Books ${stamp}`

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

test('owner sees workspace activity on the audit log; a member does not', async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  let token = ''

  await test.step('owner registers and creates a workspace', async () => {
    await registerAndSignIn(owner, OWNER)
    await owner.goto('/settings')
    await owner.getByRole('tab', { name: 'Workspace' }).click()
    await owner.locator('#workspace-name').fill(WORKSPACE)
    await owner.getByRole('button', { name: 'Create workspace' }).click()
    await expect(owner.getByText(`${WORKSPACE} — members`)).toBeVisible({ timeout: 30_000 })
  })

  await test.step('the audit log link appears for the owner', async () => {
    await expect(owner.getByRole('link', { name: 'Audit Log' })).toBeVisible({ timeout: 10_000 })
  })

  await test.step('owner adds a transaction, which the audit log records', async () => {
    await owner.goto('/transactions')
    await owner.getByRole('button', { name: 'Add Transaction' }).first().click()
    await owner.locator('#title').fill('Audited Lunch')
    await owner.locator('#amount').fill('19.00')
    await owner.locator('#category').click()
    await owner.getByRole('option').first().click()
    await owner.getByRole('button', { name: 'Save' }).click()
    await expect(owner.getByText('Audited Lunch').first()).toBeVisible({ timeout: 30_000 })
  })

  await test.step('the entry shows up on the audit log, newest first', async () => {
    await owner.goto('/audit-log')
    await expect(owner.getByText('created').first()).toBeVisible({ timeout: 30_000 })
    await expect(owner.getByText('LedgerTransaction').first()).toBeVisible()
  })

  await test.step('filtering by action narrows the list', async () => {
    await owner.getByRole('combobox').first().click()
    await owner.getByRole('option', { name: 'Deleted' }).click()
    await expect(owner.getByText('No activity yet')).toBeVisible({ timeout: 30_000 })
  })

  await test.step('owner invites a plain member', async () => {
    await owner.goto('/settings')
    await owner.getByRole('tab', { name: 'Workspace' }).click()
    await owner.locator('#invite-email').fill(MEMBER)
    await owner.locator('#invite-role').click()
    await owner.getByRole('option', { name: 'member' }).click()
    await owner.getByRole('button', { name: 'Invite' }).click()
    const tokenBox = owner.getByTestId('invite-token')
    await expect(tokenBox).toBeVisible({ timeout: 30_000 })
    token = (await tokenBox.textContent())?.trim() ?? ''
    expect(token.length).toBeGreaterThan(20)
  })

  const memberContext = await browser.newContext()
  const member = await memberContext.newPage()

  await test.step('member joins but has no audit log link', async () => {
    await registerAndSignIn(member, MEMBER)
    await member.goto('/settings')
    await member.getByRole('tab', { name: 'Workspace' }).click()
    await member.locator('#join-token').fill(token)
    await member.getByRole('button', { name: 'Join' }).click()
    await expect(member.getByText('Joined the workspace').first()).toBeVisible({
      timeout: 30_000,
    })
    await member.getByRole('button', { name: /workspace|space/i }).first().click()
    await member.getByRole('menuitem', { name: WORKSPACE }).click()

    await expect(member.getByRole('link', { name: 'Audit Log' })).toHaveCount(0)
  })

  await test.step('a direct visit explains why, instead of guessing at an empty list', async () => {
    await member.goto('/audit-log')
    await expect(member.getByText('Audit log unavailable')).toBeVisible({ timeout: 30_000 })
    await expect(
      member.getByText('Only workspace owners and admins can browse the audit log.'),
    ).toBeVisible()
  })

  await ownerContext.close()
  await memberContext.close()
})
