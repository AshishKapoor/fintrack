import { extractGoogleFontFamilies, fontCssUrl, loadThemeFonts } from '@/lib/theme-fonts'
import { themePresets } from '@/lib/theme-presets'
import { afterEach, describe, expect, it } from 'vitest'

const doom64 = themePresets.find((p) => p.key === 'doom-64')!

describe('extractGoogleFontFamilies', () => {
  it('returns the first family of each font stack', () => {
    const families = extractGoogleFontFamilies({
      'font-sans': 'Oxanium, monospace',
      'font-mono': 'Source Code Pro, monospace',
    })
    expect(families).toEqual(['Oxanium', 'Source Code Pro'])
  })

  it('skips system and non-Google fonts', () => {
    const families = extractGoogleFontFamilies({
      'font-sans': 'Signifier, serif',
      'font-serif': 'Georgia, serif',
      'font-mono': 'Menlo, monospace',
    })
    expect(families).toEqual([])
  })

  it('dedupes and strips quotes', () => {
    const families = extractGoogleFontFamilies({
      'font-sans': "'Space Mono', monospace",
      'font-mono': 'Space Mono, monospace',
    })
    expect(families).toEqual(['Space Mono'])
  })
})

describe('loadThemeFonts', () => {
  afterEach(() => {
    document.head
      .querySelectorAll("link[rel='stylesheet'], link[rel='preconnect']")
      .forEach((link) => link.remove())
  })

  it('injects one stylesheet link per family plus preconnects, without duplicates', () => {
    loadThemeFonts(doom64.styles.light)
    loadThemeFonts(doom64.styles.light)

    const hrefs = [...document.head.querySelectorAll("link[rel='stylesheet']")].map(
      (link) => (link as HTMLLinkElement).href,
    )
    expect(hrefs).toEqual([fontCssUrl('Oxanium'), fontCssUrl('Source Code Pro')])
    expect(document.head.querySelectorAll("link[rel='preconnect']")).toHaveLength(2)
  })

  it('does nothing for styles without loadable fonts', () => {
    loadThemeFonts({ 'font-sans': 'Georgia, serif' })
    expect(document.head.querySelector("link[rel='stylesheet']")).toBeNull()
  })
})
