import { applyThemePreset, clearThemePreset, resolvePresetStyles } from '@/lib/apply-theme'
import { themePresets } from '@/lib/theme-presets'
import { beforeEach, describe, expect, it } from 'vitest'

const caffeine = themePresets.find((p) => p.key === 'caffeine')!
const starryNight = themePresets.find((p) => p.key === 'starry-night')!

describe('resolvePresetStyles', () => {
  it('returns light styles as-is for light mode', () => {
    expect(resolvePresetStyles(caffeine, 'light').primary).toBe(caffeine.styles.light.primary)
  })

  it('uses dark values in dark mode', () => {
    expect(resolvePresetStyles(caffeine, 'dark').background).toBe(caffeine.styles.dark.background)
  })
})

describe('applyThemePreset', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
  })

  it('sets colour variables', () => {
    applyThemePreset(root, caffeine, 'light')
    expect(root.style.getPropertyValue('--primary')).toBe(caffeine.styles.light.primary)
    expect(root.style.getPropertyValue('--background')).toBe(caffeine.styles.light.background)
  })

  it("never sets type, shape, depth or FinTrack's destructive colour", () => {
    applyThemePreset(root, caffeine, 'dark')
    for (const name of ['font-sans', 'radius', 'shadow-md', 'tracking-normal', 'destructive']) {
      expect(root.style.getPropertyValue(`--${name}`), name).toBe('')
    }
  })

  it('derives money colours for the theme', () => {
    applyThemePreset(root, caffeine, 'light')
    for (const name of ['income', 'expense', 'caution']) {
      expect(root.style.getPropertyValue(`--${name}`), name).toMatch(/^oklch\(/)
    }
  })

  it('switching themes leaves no stale variables behind', () => {
    applyThemePreset(root, caffeine, 'light')
    applyThemePreset(root, starryNight, 'light')
    expect(root.style.getPropertyValue('--primary')).toBe(starryNight.styles.light.primary)
  })

  it('clearThemePreset removes every managed variable', () => {
    applyThemePreset(root, caffeine, 'dark')
    clearThemePreset(root)
    expect(root.getAttribute('style') || '').toBe('')
  })
})
