// Recaptures the screens the "Take the Tour" section shows (public/demo/*.webp)
// from a running FinTrack seeded with `manage.py seed_demo`. Rerun after a
// visible UI change so the tour matches the shipped app.
//
//   docker compose exec api python manage.py seed_demo --reset
//   (cd ../web && pnpm install)   # borrows apps/web's Playwright
//   node scripts/capture-demo.cjs [app url, default http://localhost:5173]
//
// Needs `cwebp` (brew install webp) for the final conversion.
const { execFileSync } = require("node:child_process");
const { mkdtempSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { chromium } = require(
  path.join(__dirname, "../../web/node_modules/@playwright/test"),
);

const BASE = process.argv[2] ?? "http://localhost:5173";
const EMAIL = process.env.FINTRACK_DEMO_EMAIL ?? "demo@fintrack.local";
const PASSWORD = process.env.FINTRACK_DEMO_PASSWORD ?? "demo-password-123";
const OUT = path.join(__dirname, "../public/demo");
const DESKTOP = ["home:/", "transactions:/transactions", "budgets:/budgets", "insights:/insights"];

async function shoot(page, url, file) {
  await page.goto(BASE + url);
  await page.locator("main").first().waitFor({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1_200); // let charts finish animating
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({ path: file });
}

function toWebp(png, name, width) {
  execFileSync("cwebp", ["-quiet", "-q", "82", "-resize", String(width), "0", png, "-o", path.join(OUT, `${name}.webp`)]);
  console.log(`public/demo/${name}.webp`);
}

(async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "fintrack-demo-"));
  const browser = await chromium.launch();
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await desktop.addInitScript(() => localStorage.setItem("vite-ui-theme", "light"));
  const page = await desktop.newPage();
  await page.goto(BASE + "/login");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /login/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });

  for (const entry of DESKTOP) {
    const [name, url] = entry.split(":");
    const png = path.join(tmp, `${name}.png`);
    await shoot(page, url, png);
    toWebp(png, name, 1920);
  }

  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    storageState: await desktop.storageState(),
  });
  await phone.addInitScript(() => localStorage.setItem("vite-ui-theme", "light"));
  const png = path.join(tmp, "home-phone.png");
  await shoot(await phone.newPage(), "/", png);
  toWebp(png, "home-phone", 780);

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
