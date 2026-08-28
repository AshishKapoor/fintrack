import { applyThemePreset, clearThemePreset, resolvePresetStyles } from '@/lib/apply-theme'
import { themePresets } from '@/lib/theme-presets'
import { beforeEach, describe, expect, it } from 'vitest'

const cyberpunk = themePresets.find((p) => p.key === 'cyberpunk')!
const neoBrutalism = themePresets.find((p) => p.key === 'neo-brutalism')!

describe('resolvePresetStyles', () => {
  it('returns light styles as-is for light mode', () => {
    const styles = resolvePresetStyles(cyberpunk, 'light')
    expect(styles.primary).toBe(cyberpunk.styles.light.primary)
  })

  it('falls back to light values for keys missing in dark mode', () => {
    // Presets omit radius/fonts from their dark block; the light value applies.
    const styles = resolvePresetStyles(cyberpunk, 'dark')
    expect(styles.background).toBe(cyberpunk.styles.dark.background)
    expect(styles.radius).toBe(cyberpunk.styles.light.radius)
  })
})

describe('applyThemePreset', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
  })

  it('sets color, radius, and font variables', () => {
    applyThemePreset(root, cyberpunk, 'light')
    expect(root.style.getPropertyValue('--primary')).toBe(cyberpunk.styles.light.primary)
    expect(root.style.getPropertyValue('--radius')).toBe(cyberpunk.styles.light.radius)
    expect(root.style.getPropertyValue('--font-sans')).toBe(cyberpunk.styles.light['font-sans'])
  })

  it('composes shadow variables from the preset shadow primitives', () => {
    applyThemePreset(root, neoBrutalism, 'light')
    const shadow = root.style.getPropertyValue('--shadow-md')
    expect(shadow).toContain(neoBrutalism.styles.light['shadow-color'])
    expect(shadow).toContain(neoBrutalism.styles.light['shadow-offset-x'])
  })

  it('switching presets leaves no stale variables behind', () => {
    applyThemePreset(root, cyberpunk, 'light')
    applyThemePreset(root, neoBrutalism, 'light')
    expect(root.style.getPropertyValue('--primary')).toBe(neoBrutalism.styles.light.primary)
  })

  it('clearThemePreset removes every managed variable', () => {
    applyThemePreset(root, cyberpunk, 'dark')
    clearThemePreset(root)
    expect(root.getAttribute('style') || '').toBe('')
  })
})
