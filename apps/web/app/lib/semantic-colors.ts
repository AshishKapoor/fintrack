import type { ThemeStyleProps } from '@/lib/theme-preset-types'

/**
 * Income, expense and caution colours that stay legible on any theme preset.
 *
 * The defaults in globals.css are tuned for FinTrack's own oat and forest
 * surfaces. A colour theme swaps those surfaces for its own, which the
 * defaults were never checked against. So when a theme is applied, each colour keeps
 * its hue and is walked along the lightness axis until it clears AA as body
 * text on every surface an amount can sit on, starting from the default so a
 * preset that already passes gets exactly FinTrack's colour.
 */

type Mode = 'light' | 'dark'
type Oklch = { l: number; c: number; h: number }

export const SEMANTIC_COLOR_VARS = ['income', 'expense', 'caution'] as const
type SemanticColor = (typeof SEMANTIC_COLOR_VARS)[number]

// Mirrors :root and .dark in globals.css.
const DEFAULTS: Record<Mode, Record<SemanticColor, Oklch>> = {
  light: {
    income: { l: 0.48, c: 0.1, h: 163.225 },
    expense: { l: 0.52, c: 0.205, h: 17.585 },
    caution: { l: 0.505, c: 0.12, h: 58.318 },
  },
  dark: {
    income: { l: 0.755, c: 0.145, h: 163.225 },
    expense: { l: 0.79, c: 0.12, h: 17.585 },
    caution: { l: 0.785, c: 0.145, h: 58.318 },
  },
}

// Surfaces an amount is rendered on: the page, cards and popovers, and the
// muted fill behind hovered and selected table rows. Not `secondary`: amounts
// never sit on it, and many presets use it as an inverted accent (near-black in
// a light theme), which no single text colour could clear alongside the rest.
const SURFACES = ['background', 'card', 'popover', 'muted']

const AA_BODY_TEXT = 4.5
const STEP = 0.005

function oklchToLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
}

function inGamut(rgb: [number, number, number]) {
  return rgb.every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4)
}

function luminance([r, g, b]: [number, number, number]) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b)
}

/** Relative luminance of a preset colour, or null for a notation we do not parse. */
export function parseLuminance(value: string): number | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})(?:[0-9a-f]{2})?$/i)
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1]
    const channels = [0, 2, 4].map((i) => {
      const v = parseInt(digits.slice(i, i + 2), 16) / 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return luminance(channels as [number, number, number])
  }
  const oklch = value.trim().match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i)
  if (oklch) {
    const l = parseFloat(oklch[1]) / (oklch[2] ? 100 : 1)
    return luminance(oklchToLinearSrgb({ l, c: parseFloat(oklch[3]), h: parseFloat(oklch[4]) }))
  }
  return null
}

function contrast(a: number, b: number) {
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** Highest chroma at or below `c` that this lightness can render in sRGB. */
function fitChroma(l: number, c: number, h: number): Oklch {
  let chroma = c
  while (chroma > 0 && !inGamut(oklchToLinearSrgb({ l, c: chroma, h }))) chroma -= STEP
  return { l, c: Math.max(0, chroma), h }
}

function worstContrast(color: Oklch, surfaces: number[]) {
  const lum = luminance(oklchToLinearSrgb(color))
  return Math.min(...surfaces.map((surface) => contrast(lum, surface)))
}

function format({ l, c, h }: Oklch) {
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h})`
}

/**
 * The nearest lightness to `base` (in either direction) that clears AA on every
 * surface. Falls back to the best achievable when nothing does, which only a
 * mid-grey surface could cause.
 */
function legibleOn(base: Oklch, surfaces: number[]): Oklch {
  if (worstContrast(base, surfaces) >= AA_BODY_TEXT) return base
  let best = base
  let bestContrast = worstContrast(base, surfaces)
  for (let offset = STEP; offset <= 1; offset += STEP) {
    for (const l of [base.l - offset, base.l + offset]) {
      if (l < 0 || l > 1) continue
      const candidate = fitChroma(l, base.c, base.h)
      const candidateContrast = worstContrast(candidate, surfaces)
      if (candidateContrast >= AA_BODY_TEXT) return candidate
      if (candidateContrast > bestContrast) {
        best = candidate
        bestContrast = candidateContrast
      }
    }
  }
  return best
}

/** CSS values for --income/--expense/--caution that are legible on this preset. */
export function deriveSemanticColors(
  styles: ThemeStyleProps,
  mode: Mode,
): Record<SemanticColor, string> {
  const surfaces = SURFACES.map((name) => styles[name])
    .filter(Boolean)
    .map(parseLuminance)
    .filter((lum): lum is number => lum !== null)

  const result = {} as Record<SemanticColor, string>
  for (const name of SEMANTIC_COLOR_VARS) {
    const base = DEFAULTS[mode][name]
    result[name] = format(surfaces.length ? legibleOn(base, surfaces) : base)
  }
  return result
}
