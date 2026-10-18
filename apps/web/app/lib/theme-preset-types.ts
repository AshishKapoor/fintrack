// The shapes and default key for colour themes. The curated catalogue itself
// lives in theme-presets.ts.

export type ThemeStyleProps = Record<string, string>

export interface ThemePreset {
  key: string
  label: string
  styles: {
    light: ThemeStyleProps
    dark: ThemeStyleProps
  }
}

export const DEFAULT_THEME_KEY = 'default'
