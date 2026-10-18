import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { resolvePresetStyles } from '@/lib/apply-theme'
import { DEFAULT_THEME_KEY, themePresets, type ThemePreset } from '@/lib/theme-presets'
import { Paintbrush } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// FinTrack's own primary, secondary and background (globals.css). Literal, not
// var(--primary): while another theme is active those variables hold its colours.
const FINTRACK_SWATCH = {
  light: ['oklch(0.52 0.13 144.17)', 'oklch(0.96 0.02 147.64)', 'oklch(0.97 0.01 80.72)'],
  dark: ['oklch(0.67 0.16 144.21)', 'oklch(0.39 0.03 142.99)', 'oklch(0.27 0.03 150.77)'],
}

/** Three dots previewing a theme: its accent, a secondary surface and its background. */
function ThemeSwatch({ preset, mode }: { preset?: ThemePreset; mode: 'light' | 'dark' }) {
  const colors = preset
    ? (() => {
        const styles = resolvePresetStyles(preset, mode)
        return [styles.primary, styles.secondary, styles.background]
      })()
    : FINTRACK_SWATCH[mode]

  return (
    <span aria-hidden='true' className='flex shrink-0 items-center -space-x-1'>
      {colors.map((color, index) => (
        <span
          key={index}
          className='h-3.5 w-3.5 rounded-full border border-border'
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { theme, colorTheme, setColorTheme } = useTheme()

  const mode: 'light' | 'dark' =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  // A retired theme key still stored from before the curated set reads as the
  // FinTrack theme, which is what the provider applies for it.
  const selected = themePresets.some((preset) => preset.key === colorTheme)
    ? colorTheme
    : DEFAULT_THEME_KEY

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon'>
          <Paintbrush className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>{t('themeSwitcher.label')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-52'>
        <DropdownMenuLabel>{t('themeSwitcher.label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={selected} onValueChange={setColorTheme}>
          <DropdownMenuRadioItem value={DEFAULT_THEME_KEY} className='gap-2'>
            <ThemeSwatch mode={mode} />
            {t('themeSwitcher.default')}
          </DropdownMenuRadioItem>
          {themePresets.map((preset) => (
            <DropdownMenuRadioItem key={preset.key} value={preset.key} className='gap-2'>
              <ThemeSwatch preset={preset} mode={mode} />
              {preset.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
