import { applyThemePreset, clearThemePreset } from '@/lib/apply-theme'
import { DEFAULT_THEME_KEY, themePresets } from '@/lib/theme-presets'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  colorThemeStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  colorTheme: string
  setColorTheme: (colorTheme: string) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  colorTheme: DEFAULT_THEME_KEY,
  setColorTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

// Left behind by the earlier 42-theme picker: favourites, and a cached copy of
// the active preset from when the catalogue was loaded on demand.
const RETIRED_STORAGE_KEYS = ['vite-ui-favorite-themes', 'vite-ui-color-theme-preset']

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  colorThemeStorageKey = 'vite-ui-color-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  )
  // A key from a theme that is no longer offered resolves to no preset below,
  // so FinTrack's own theme applies.
  const [colorTheme, setColorTheme] = useState<string>(
    () => localStorage.getItem(colorThemeStorageKey) || DEFAULT_THEME_KEY,
  )

  useEffect(() => {
    for (const key of RETIRED_STORAGE_KEYS) localStorage.removeItem(key)
  }, [])

  useEffect(() => {
    const root = window.document.documentElement

    const apply = () => {
      const mode =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme

      root.classList.remove('light', 'dark')
      root.classList.add(mode)

      const preset = themePresets.find((p) => p.key === colorTheme)
      if (preset) {
        applyThemePreset(root, preset, mode)
      } else {
        clearThemePreset(root)
      }
    }

    apply()

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [theme, colorTheme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    colorTheme,
    setColorTheme: (colorTheme: string) => {
      localStorage.setItem(colorThemeStorageKey, colorTheme)
      setColorTheme(colorTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
