import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Automated accessibility checks - ROADMAP.md Phase 4's "accessibility pass".
 *
 * Radix gives the interactive primitives correct roles and focus behaviour for
 * free, which is why this project got as far as it did without a check. What
 * Radix cannot know is anything about *this* app: whether a chart has a text
 * alternative, whether an icon-only button says what it does, whether the
 * palette clears contrast, whether headings are in order. That is the gap axe
 * fills, and it is the gap this spec exists to hold closed.
 *
 * Scope, deliberately stated rather than implied: axe catches roughly a third
 * of WCAG failures. A clean run here is not a claim that the app is
 * accessible - it is a claim that it has no *automatically detectable*
 * violation at WCAG 2.1 A/AA, which is the part a CI job can actually keep
 * true. Keyboard-only navigation is covered separately by
 * keyboard-entry.spec.ts.
 */

const PASSWORD = 'Sup3rSecret!pass'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

function uniqueEmail() {
  return `e2e-a11y-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`
}

function scan(page: Page) {
  return new AxeBuilder({ page }).withTags(WCAG_TAGS)
}

/** Report every violation at once, with the offending markup, not just the first. */
function describe(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `      ${node.html}\n      ${node.failureSummary?.replace(/\n/g, '\n      ')}`)
        .join('\n')
      return `  [${violation.impact}] ${violation.id}: ${violation.help}\n${nodes}`
    })
    .join('\n')
}

/**
 * Radix dialogs fade and zoom in. Scanning mid-animation makes axe composite a
 * half-transparent element against what is behind it and report a
 * colour-contrast failure that no user ever sees, so wait for the animations
 * to finish first.
 */
async function settle(page: Page) {
  await page.waitForFunction(
    () => document.getAnimations().every((animation) => animation.playState !== 'running'),
    undefined,
    { timeout: 5_000 },
  ).catch(() => {})
}

async function expectNoViolations(page: Page, builder = scan(page)) {
  await settle(page)
  const { violations } = await builder.analyze()
  expect(violations.length, `Accessibility violations:\n${describe(violations)}`).toBe(0)
}

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await expect(page.locator('#password')).toBeVisible({ timeout: 20_000 })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
}

test.describe('signed out', () => {
  for (const path of ['/login', '/register']) {
    test(`${path} has no automatically detectable violations`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('#password')).toBeVisible({ timeout: 30_000 })
      await expectNoViolations(page)
    })
  }

  test('reduced-motion preference calms UI transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/login')
    const trigger = page.getByRole('button', { name: /login/i })
    await expect(trigger).toBeVisible({ timeout: 30_000 })

    const longestDuration = await trigger.evaluate((element) => {
      const styles = getComputedStyle(element)
      const durations = `${styles.animationDuration},${styles.transitionDuration}`
        .split(',')
        .map((duration) => Number.parseFloat(duration))
      return Math.max(...durations)
    })

    // Computed durations are expressed in seconds; 0.01ms is 0.00001s.
    expect(longestDuration).toBeLessThanOrEqual(0.00001)
  })
})

test.describe('signed in', () => {
  // One account for the whole file, created through the API rather than the
  // register form. These checks do not mutate anything, so they can share it -
  // and the default register throttle is 5/hour, which three registrations per
  // run would eat through on any machine running the suite twice.
  let email: string

  test.beforeAll(async ({ request }) => {
    email = uniqueEmail()
    const response = await request.post('/api/v1/register/', {
      data: { email, password: PASSWORD, confirm_password: PASSWORD },
    })
    expect(response.status(), await response.text()).toBe(201)
  })

  test('every main page has no automatically detectable violations', async ({ page }) => {
    await signIn(page, email)

    const pages: [string, string][] = [
      ['/', 'Dashboard'],
      ['/transactions', 'Transactions'],
      ['/categories', 'Categories'],
      ['/budgets', 'Budgets'],
      ['/accounts', 'Accounts'],
      ['/savings-goals', 'Savings goals'],
      ['/quick-add', 'Quick add'],
      ['/reports', 'Reports'],
      ['/insights', 'Insights'],
      ['/rules', 'Rules'],
      ['/settings', 'Settings'],
      ['/this-route-does-not-exist', 'Page not found'],
    ]

    for (const [path, label] of pages) {
      await test.step(label, async () => {
        await page.goto(path)
        // Wait for the shell rather than page-specific copy: this spec should
        // not need editing every time a heading is reworded.
        await expect(page.locator('main, [role="main"]').first()).toBeVisible({
          timeout: 30_000,
        })
        await page.waitForLoadState('networkidle')
        await expectNoViolations(page)
      })
    }
  })

  test('the add-transaction dialog is reachable and labelled', async ({ page }) => {
    await signIn(page, email)
    await page.goto('/transactions')

    const trigger = page.getByRole('button', { name: 'Add Transaction' }).first()
    await trigger.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 })

    // Scoped to the dialog: a modal traps focus, so the page behind it is
    // inert and its markup is not what a user is dealing with here.
    await expectNoViolations(page, scan(page).include('[role="dialog"]'))

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('the command palette is labelled', async ({ page }) => {
    await signIn(page, email)
    await page.goto('/')
    // The Ctrl+K listener is attached in an effect, so pressing it before the
    // dashboard has finished mounting does nothing at all.
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({
      timeout: 30_000,
    })
    await page.waitForLoadState('networkidle')

    await expect(async () => {
      await page.keyboard.press('Control+k')
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 30_000 })

    await expectNoViolations(page, scan(page).include('[role="dialog"]'))
  })
})
