import { resolvePresetStyles } from '@/lib/apply-theme'
import { deriveSemanticColors, parseLuminance } from '@/lib/semantic-colors'
import { themePresets } from '@/lib/theme-presets'
import { describe, expect, it } from 'vitest'

function contrast(a: number, b: number) {
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

describe('parseLuminance', () => {
  it('reads hex in short and long form', () => {
    expect(parseLuminance('#fff')).toBeCloseTo(1, 5)
    expect(parseLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('reads oklch with and without a percentage lightness', () => {
    expect(parseLuminance('oklch(1 0 0)')).toBeCloseTo(1, 3)
    expect(parseLuminance('oklch(100% 0 0)')).toBeCloseTo(1, 3)
  })

  it('returns null for a notation it does not understand', () => {
    expect(parseLuminance('var(--x)')).toBeNull()
  })
})

describe('deriveSemanticColors', () => {
  it("keeps FinTrack's own colours when a preset's surfaces already pass", () => {
    const colors = deriveSemanticColors(
      { background: 'oklch(0.97 0.01 80.72)', card: 'oklch(0.97 0.01 80.72)' },
      'light',
    )
    expect(colors.income).toBe('oklch(0.480 0.100 163.225)')
  })

  // The guarantee the module exists for, checked against every shipped preset
  // rather than a sample: a new or regenerated preset cannot quietly bring back
  // unreadable amounts.
  for (const preset of themePresets) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${preset.key} (${mode}): every colour clears 4.5:1 on every surface`, () => {
        const styles = resolvePresetStyles(preset, mode)
        const colors = deriveSemanticColors(styles, mode)
        for (const surface of ['background', 'card', 'popover', 'muted']) {
          const surfaceLum = styles[surface] ? parseLuminance(styles[surface]) : null
          if (surfaceLum === null) continue
          for (const [name, value] of Object.entries(colors)) {
            const ratio = contrast(parseLuminance(value)!, surfaceLum)
            expect(ratio, `${name} on ${surface}`).toBeGreaterThanOrEqual(4.5)
          }
        }
      })
    }
  }
})
