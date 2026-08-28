import type { ThemePreset, ThemeStyleProps } from '@/lib/theme-presets'

// CSS variables from globals.css that a tweakcn preset can override directly.
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
  'destructive',
  'destructive-foreground',
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

const OTHER_VARS = ['font-sans', 'font-serif', 'font-mono', 'radius']

const SHADOW_VARS = [
  'shadow-2xs',
  'shadow-xs',
  'shadow-sm',
  'shadow',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'shadow-2xl',
]

const MANAGED_VARS = [...COLOR_VARS, ...OTHER_VARS, ...SHADOW_VARS, 'tracking-normal']

// Defaults tweakcn assumes when a preset omits a shadow primitive
// (see config/theme.ts in https://github.com/jnsahaj/tweakcn).
const SHADOW_DEFAULTS = {
  'shadow-color': 'hsl(0 0% 0%)',
  'shadow-opacity': '0.1',
  'shadow-blur': '3px',
  'shadow-spread': '0px',
  'shadow-offset-x': '0',
  'shadow-offset-y': '1px',
}

// Port of tweakcn's getShadowMap (utils/shadows.ts), using color-mix() so any
// color notation the presets use (hex, hsl, oklch) works without conversion.
function getShadowMap(styles: ThemeStyleProps): Record<string, string> {
  const shadowColor = styles['shadow-color'] ?? SHADOW_DEFAULTS['shadow-color']
  const opacity = parseFloat(styles['shadow-opacity'] ?? SHADOW_DEFAULTS['shadow-opacity'])
  const offsetX = styles['shadow-offset-x'] ?? SHADOW_DEFAULTS['shadow-offset-x']
  const offsetY = styles['shadow-offset-y'] ?? SHADOW_DEFAULTS['shadow-offset-y']
  const blur = styles['shadow-blur'] ?? SHADOW_DEFAULTS['shadow-blur']
  const spread = styles['shadow-spread'] ?? SHADOW_DEFAULTS['shadow-spread']

  const color = (opacityMultiplier: number) => {
    const pct = Math.min(100, Math.max(0, opacity * opacityMultiplier * 100))
    return `color-mix(in srgb, ${shadowColor} ${pct.toFixed(0)}%, transparent)`
  }

  const secondLayer = (fixedOffsetY: string, fixedBlur: string) => {
    const spread2 = `${parseFloat(spread.replace('px', '') || '0') - 1}px`
    return `${offsetX} ${fixedOffsetY} ${fixedBlur} ${spread2} ${color(1)}`
  }

  const firstLayer = (opacityMultiplier: number) =>
    `${offsetX} ${offsetY} ${blur} ${spread} ${color(opacityMultiplier)}`

  return {
    'shadow-2xs': firstLayer(0.5),
    'shadow-xs': firstLayer(0.5),
    'shadow-sm': `${firstLayer(1)}, ${secondLayer('1px', '2px')}`,
    shadow: `${firstLayer(1)}, ${secondLayer('1px', '2px')}`,
    'shadow-md': `${firstLayer(1)}, ${secondLayer('2px', '4px')}`,
    'shadow-lg': `${firstLayer(1)}, ${secondLayer('4px', '6px')}`,
    'shadow-xl': `${firstLayer(1)}, ${secondLayer('8px', '10px')}`,
    'shadow-2xl': firstLayer(2.5),
  }
}

export function resolvePresetStyles(preset: ThemePreset, mode: 'light' | 'dark'): ThemeStyleProps {
  // Dark mode falls back to the preset's light values for any missing key,
  // mirroring tweakcn's mergePresetWithDefaults.
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

  for (const name of [...COLOR_VARS, ...OTHER_VARS]) {
    const value = styles[name]
    if (value) root.style.setProperty(`--${name}`, value)
  }

  const letterSpacing = styles['letter-spacing']
  if (letterSpacing && letterSpacing !== 'normal') {
    root.style.setProperty('--tracking-normal', letterSpacing)
  }

  for (const [name, value] of Object.entries(getShadowMap(styles))) {
    root.style.setProperty(`--${name}`, value)
  }
}
