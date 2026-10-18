import { deriveSemanticColors, SEMANTIC_COLOR_VARS } from '@/lib/semantic-colors'
import type { ThemePreset, ThemeStyleProps } from '@/lib/theme-preset-types'

// The CSS variables from globals.css a colour theme may set. Only colours: a
// theme never touches type, radius or shadows, and never the destructive
// colour, which keeps FinTrack's own AA-checked values in every theme.
const COLOR_VARS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
]

const MANAGED_VARS = [...COLOR_VARS, ...SEMANTIC_COLOR_VARS]

export function resolvePresetStyles(preset: ThemePreset, mode: 'light' | 'dark'): ThemeStyleProps {
  // Dark mode falls back to the preset's light value for any key it omits.
  return mode === 'dark' ? { ...preset.styles.light, ...preset.styles.dark } : preset.styles.light
}

export function clearThemePreset(root: HTMLElement) {
  for (const name of MANAGED_VARS) {
    root.style.removeProperty(`--${name}`)
  }
}

export function applyThemePreset(root: HTMLElement, preset: ThemePreset, mode: 'light' | 'dark') {
  clearThemePreset(root)
  const styles = resolvePresetStyles(preset, mode)

  for (const name of COLOR_VARS) {
    const value = styles[name]
    if (value) root.style.setProperty(`--${name}`, value)
  }

  // Money colours keep their hue but are re-derived against this theme's
  // surfaces, so amounts stay legible whichever theme is chosen.
  for (const [name, value] of Object.entries(deriveSemanticColors(styles, mode))) {
    root.style.setProperty(`--${name}`, value)
  }
}
