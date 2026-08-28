import { applyThemePreset, clearThemePreset } from '@/lib/apply-theme'
import { DEFAULT_THEME_KEY, themePresets } from '@/lib/theme-presets'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  colorThemeStorageKey?: string
  favoritesStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  colorTheme: string
  setColorTheme: (colorTheme: string) => void
  favoriteThemes: string[]
  toggleFavoriteTheme: (colorTheme: string) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  colorTheme: DEFAULT_THEME_KEY,
  setColorTheme: () => null,
  favoriteThemes: [],
  toggleFavoriteTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function readFavorites(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  colorThemeStorageKey = 'vite-ui-color-theme',
  favoritesStorageKey = 'vite-ui-favorite-themes',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  )
  const [colorTheme, setColorTheme] = useState<string>(
    () => localStorage.getItem(colorThemeStorageKey) || DEFAULT_THEME_KEY,
  )
  const [favoriteThemes, setFavoriteThemes] = useState<string[]>(() =>
    readFavorites(favoritesStorageKey),
  )

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

  const toggleFavoriteTheme = useCallback(
    (key: string) => {
      setFavoriteThemes((current) => {
        const next = current.includes(key)
          ? current.filter((item) => item !== key)
          : [...current, key]
        localStorage.setItem(favoritesStorageKey, JSON.stringify(next))
        return next
      })
    },
    [favoritesStorageKey],
  )

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
    favoriteThemes,
    toggleFavoriteTheme,
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
