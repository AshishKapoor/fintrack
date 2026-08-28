import type { ThemeStyleProps } from '@/lib/theme-presets'

// Font families referenced by the tweakcn presets that are served by Google
// Fonts (each verified against the css2 API). System and commercial fonts
// (Georgia, Menlo, Signifier, …) are excluded — they either need no loading
// or cannot be loaded from Google Fonts.
const GOOGLE_FONT_FAMILIES = new Set([
  'Antic',
  'Architects Daughter',
  'DM Sans',
  'Fira Code',
  'Geist',
  'Geist Mono',
  'IBM Plex Mono',
  'Inter',
  'JetBrains Mono',
  'Libre Baskerville',
  'Lora',
  'Merriweather',
  'Montserrat',
  'Open Sans',
  'Outfit',
  'Oxanium',
  'Playfair Display',
  'Plus Jakarta Sans',
  'Poppins',
  'Quicksand',
  'Roboto',
  'Roboto Mono',
  'Source Code Pro',
  'Source Serif 4',
  'Space Mono',
  'Ubuntu Mono',
])

// The css2 API serves the nearest available weight, so one weight set works
// for every family above (verified: all return 200).
const FONT_WEIGHTS = '400;500;600;700'

const FONT_KEYS = ['font-sans', 'font-serif', 'font-mono'] as const

/** First family of each font stack in the styles, deduped, loadable ones only. */
export function extractGoogleFontFamilies(styles: ThemeStyleProps): string[] {
  const families = new Set<string>()
  for (const key of FONT_KEYS) {
    const stack = styles[key]
    if (!stack) continue
    const first = stack.split(',')[0].trim().replace(/^["']|["']$/g, '')
    if (GOOGLE_FONT_FAMILIES.has(first)) families.add(first)
  }
  return [...families]
}

export function fontCssUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${FONT_WEIGHTS}&display=swap`
}

function ensurePreconnect(href: string, crossOrigin: boolean) {
  if (document.head.querySelector(`link[rel='preconnect'][href='${href}']`)) return
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = href
  if (crossOrigin) link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

/**
 * Inject stylesheet links for the theme's fonts. Each family is added once
 * per page load and stays cached by the browser after that; families already
 * present are skipped, so calling this on every theme change is cheap.
 */
export function loadThemeFonts(styles: ThemeStyleProps) {
  const families = extractGoogleFontFamilies(styles)
  if (families.length === 0) return

  ensurePreconnect('https://fonts.googleapis.com', false)
  ensurePreconnect('https://fonts.gstatic.com', true)

  for (const family of families) {
    const href = fontCssUrl(family)
    if (document.head.querySelector(`link[rel='stylesheet'][href='${href}']`)) continue
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }
}
