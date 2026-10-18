import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * Axe over every page against a populated account, in both themes and at
 * desktop and phone widths.
 *
 * accessibility.spec.ts scans a freshly registered user in light mode on a
 * desktop viewport. That account has no money on screen, so it structurally
 * cannot see the surfaces most likely to break: income and expense amounts,
 * budget progress bars, the Insights tables, the dark palette, and the phone
 * layout. Every one of those shipped an axe violation that the empty-account
 * scan passed.
 *
 * It signs in as the account `manage.py seed_demo` creates (CI runs it before
 * Playwright). Run it locally with:
 *
 *   docker compose exec api python manage.py seed_demo
 *
 * Without the seed it skips locally and fails in CI, so it can never quietly
 * stop checking anything.
 */

const EMAIL = process.env.E2E_SEEDED_EMAIL ?? 'demo@fintrack.local'
const PASSWORD = process.env.E2E_SEEDED_PASSWORD ?? 'demo-password-123'
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const PAGES = [
  '/',
  '/transactions',
  '/categories',
  '/budgets',
  '/accounts',
  '/savings-goals',
  '/quick-add',
  '/reports',
  '/insights',
  '/rules',
  '/settings',
]

const VARIANTS = [
  { name: 'light, desktop', theme: 'light', viewport: { width: 1280, height: 800 }, touch: false },
  { name: 'dark, desktop', theme: 'dark', viewport: { width: 1280, height: 800 }, touch: false },
  { name: 'light, phone', theme: 'light', viewport: { width: 390, height: 844 }, touch: true },
  { name: 'dark, phone', theme: 'dark', viewport: { width: 390, height: 844 }, touch: true },
] as const

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page
    .waitForFunction(
      () => document.getAnimations().every((animation) => animation.playState !== 'running'),
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => {})
}

async function seededAccountExists(browser: Browser) {
  const context = await browser.newContext()
  const response = await context.request.post('/api/token/', {
    data: { email: EMAIL, password: PASSWORD },
  })
  await context.close()
  return response.ok()
}

test.describe('signed in with real data', () => {
  test.beforeAll(async ({ browser }) => {
    const exists = await seededAccountExists(browser)
    if (!exists && process.env.CI) {
      throw new Error(`Seeded account ${EMAIL} is missing: run manage.py seed_demo first.`)
    }
    test.skip(!exists, `Seeded account ${EMAIL} not found; run manage.py seed_demo to enable.`)
  })

  for (const variant of VARIANTS) {
    test(`every page has no violations (${variant.name})`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: variant.viewport,
        hasTouch: variant.touch,
        isMobile: variant.touch,
      })
      await context.addInitScript((theme) => {
        localStorage.setItem('vite-ui-theme', theme)
      }, variant.theme)
      const page = await context.newPage()

      await page.goto('/login')
      await page.locator('#email').fill(EMAIL)
      await page.locator('#password').fill(PASSWORD)
      await page.getByRole('button', { name: /login/i }).click()
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })

      const failures: string[] = []
      for (const path of PAGES) {
        await page.goto(path)
        await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })
        await settle(page)

        const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
        for (const violation of violations) {
          const nodes = violation.nodes.map((node) => `      ${node.html}`).join('\n')
          failures.push(`  ${path} [${violation.impact}] ${violation.id}: ${violation.help}\n${nodes}`)
        }

        // One h1 per page, so heading navigation has somewhere to land.
        expect(await page.locator('h1').count(), `${path} should have exactly one h1`).toBe(1)

        // Nothing may push the page wider than the viewport.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        )
        expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(0)
      }

      expect(failures, `Accessibility violations:\n${failures.join('\n')}`).toEqual([])
      await context.close()
    })
  }
})
