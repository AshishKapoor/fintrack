import { resolvePresetStyles } from '@/lib/apply-theme'
import { parseLuminance } from '@/lib/semantic-colors'
import { themePresets } from '@/lib/theme-presets'
import { describe, expect, it } from 'vitest'

/**
 * Every curated theme holds WCAG AA in both modes - the bar a theme has to
 * clear to be offered at all. Adding a theme that fails is a test failure, not
 * a review comment.
 */

function contrast(a: string, b: string) {
  const [x, y] = [parseLuminance(a)!, parseLuminance(b)!]
  const [hi, lo] = x > y ? [x, y] : [y, x]
  return (hi + 0.05) / (lo + 0.05)
}

// [text or fill, surface it sits on, minimum ratio]
const PAIRS: [string, string, number][] = [
  ['foreground', 'background', 4.5],
  ['card-foreground', 'card', 4.5],
  ['popover-foreground', 'popover', 4.5],
  ['muted-foreground', 'muted', 4.5],
  ['muted-foreground', 'card', 4.5],
  ['muted-foreground', 'background', 4.5],
  ['primary-foreground', 'primary', 4.5],
  ['secondary-foreground', 'secondary', 4.5],
  ['accent-foreground', 'accent', 4.5],
  ['sidebar-foreground', 'sidebar', 4.5],
  // Primary is also link text, so it needs body-text contrast, not 3:1.
  ['primary', 'background', 4.5],
  ['ring', 'background', 3],
]

describe('curated colour themes', () => {
  it('offers a short, curated list', () => {
    expect(themePresets.length).toBeLessThanOrEqual(6)
  })

  for (const preset of themePresets) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${preset.label} (${mode}) meets AA on every pair`, () => {
        const styles = resolvePresetStyles(preset, mode)
        for (const [fg, bg, minimum] of PAIRS) {
          if (!styles[fg] || !styles[bg]) continue
          expect(contrast(styles[fg], styles[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(minimum)
        }
      })

      it(`${preset.label} (${mode}) sets colours only`, () => {
        const styles = resolvePresetStyles(preset, mode)
        for (const key of Object.keys(styles)) {
          expect(key, 'themes must not carry fonts, radius, shadows or destructive').not.toMatch(
            /^(font-|radius|shadow|letter-spacing|destructive)/,
          )
        }
      })
    }
  }
})
