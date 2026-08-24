import { defineConfig } from 'i18next-cli'

// Keeps public/locales/*/translation.json in sync with t() calls in app/.
// Run `pnpm i18n:extract` after adding new strings: it appends new keys (with
// their default value) to en/translation.json and adds empty placeholders for
// the same key to every other locale for a translator to fill in. See
// docs/i18n.md for the contributor workflow this feeds into (Weblate).
export default defineConfig({
  locales: ['en', 'es'],
  extract: {
    input: ['app/**/*.{ts,tsx}'],
    output: 'public/locales/{{language}}/{{namespace}}.json',
    defaultNS: 'translation',
    primaryLanguage: 'en',
    indentation: 2,
    sort: true,
  },
})
