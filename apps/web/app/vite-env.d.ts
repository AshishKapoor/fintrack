/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FinTrack API. Defaults to the page origin. */
  readonly VITE_BASE_DOMAIN?: string
  /** Optional analytics. Both must be set for any script to load. */
  readonly VITE_UMAMI_SCRIPT_URL?: string
  readonly VITE_UMAMI_WEBSITE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
