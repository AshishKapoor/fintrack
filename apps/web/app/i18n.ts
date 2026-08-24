import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

/**
 * Every language a translation.json exists for. Weblate contributors add a
 * catalog under apps/web/public/locales/<code>/translation.json and a row
 * here - nothing else needs to change for the language to become selectable.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const

export const LANGUAGE_STORAGE_KEY = 'fintrack_language'

// Catalogs are fetched at runtime (public/locales, same static-asset origin
// as manifest.webmanifest and sw.js) rather than bundled, so a Weblate-driven
// translation update ships without a frontend rebuild. bootstrap() in
// main.tsx awaits i18nReady before the first render, so there is no
// flash-of-untranslated-content to guard against with Suspense.
export const i18nReady = i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n
