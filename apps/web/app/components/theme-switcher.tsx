import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { resolvePresetStyles } from '@/lib/apply-theme'
import { DEFAULT_THEME_KEY, themePresets, type ThemePreset } from '@/lib/theme-presets'
import { cn } from '@/lib/utils'
import { Check, Paintbrush, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

function ThemeSwatch({ preset, mode }: { preset?: ThemePreset; mode: 'light' | 'dark' }) {
  const colors = preset
    ? (() => {
        const styles = resolvePresetStyles(preset, mode)
        return [styles.primary, styles.accent, styles.secondary, styles.background]
      })()
    : ['var(--primary)', 'var(--accent)', 'var(--secondary)', 'var(--background)']

  return (
    <div className='flex shrink-0 items-center -space-x-1'>
      {colors.map((color, index) => (
        <span
          key={index}
          className='h-3.5 w-3.5 rounded-full border border-border/60'
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

interface ThemeItemProps {
  preset?: ThemePreset
  label: string
  themeKey: string
  mode: 'light' | 'dark'
  isActive: boolean
  isFavorite: boolean
  favoriteLabel: string
  onSelect: (key: string) => void
  onToggleFavorite: (key: string) => void
}

function ThemeItem({
  preset,
  label,
  themeKey,
  mode,
  isActive,
  isFavorite,
  favoriteLabel,
  onSelect,
  onToggleFavorite,
}: ThemeItemProps) {
  return (
    <CommandItem
      value={`${themeKey} ${label}`}
      onSelect={() => onSelect(themeKey)}
      className='group flex items-center gap-2'
    >
      <ThemeSwatch preset={preset} mode={mode} />
      <span className='flex-1 truncate'>{label}</span>
      <Check className={cn('h-4 w-4 shrink-0', isActive ? 'opacity-100' : 'opacity-0')} />
      <button
        type='button'
        tabIndex={-1}
        aria-label={favoriteLabel}
        aria-pressed={isFavorite}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onToggleFavorite(themeKey)
        }}
        className={cn(
          'shrink-0 rounded-sm p-0.5 transition-opacity hover:text-foreground',
          isFavorite
            ? 'text-amber-500 opacity-100 hover:text-amber-600'
            : 'text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
      </button>
    </CommandItem>
  )
}

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { theme, colorTheme, setColorTheme, favoriteThemes, toggleFavoriteTheme } = useTheme()
  const [open, setOpen] = useState(false)

  const mode: 'light' | 'dark' =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  const { favorites, others } = useMemo(() => {
    const favorites: (ThemePreset | undefined)[] = []
    const others: (ThemePreset | undefined)[] = []
    const all: (ThemePreset | undefined)[] = [undefined, ...themePresets]
    for (const preset of all) {
      const key = preset?.key ?? DEFAULT_THEME_KEY
      if (favoriteThemes.includes(key)) {
        favorites.push(preset)
      } else {
        others.push(preset)
      }
    }
    return { favorites, others }
  }, [favoriteThemes])

  const renderItem = (preset?: ThemePreset) => {
    const key = preset?.key ?? DEFAULT_THEME_KEY
    return (
      <ThemeItem
        key={key}
        preset={preset}
        themeKey={key}
        label={preset?.label ?? t('themeSwitcher.default')}
        mode={mode}
        isActive={colorTheme === key}
        isFavorite={favoriteThemes.includes(key)}
        favoriteLabel={t('themeSwitcher.toggleFavorite')}
        onSelect={(selected) => {
          setColorTheme(selected)
          setOpen(false)
        }}
        onToggleFavorite={toggleFavoriteTheme}
      />
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon'>
          <Paintbrush className='h-[1.2rem] w-[1.2rem]' />
          <span className='sr-only'>{t('themeSwitcher.label')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-72 p-0'>
        <Command>
          <CommandInput placeholder={t('themeSwitcher.findTheme')} />
          <CommandList>
            <CommandEmpty>{t('themeSwitcher.noThemeFound')}</CommandEmpty>
            {favorites.length > 0 && (
              <>
                <CommandGroup heading={t('themeSwitcher.favorites')}>
                  {favorites.map(renderItem)}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading={t('themeSwitcher.allThemes')}>
              {others.map(renderItem)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
