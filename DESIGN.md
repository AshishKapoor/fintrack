---
name: FinTrack
description: A calm, warm, exact household ledger on oat paper with Ledger Green ink.
colors:
  ledger-green: "oklch(0.52 0.13 144.17)"
  ledger-green-deep: "oklch(0.43 0.12 144.31)"
  sprout-wash: "oklch(0.96 0.02 147.64)"
  sprout-tint: "oklch(0.9 0.05 146.04)"
  income: "oklch(0.48 0.1 163.225)"
  expense: "oklch(0.52 0.205 17.585)"
  caution: "oklch(0.505 0.12 58.318)"
  ledger-red: "oklch(0.515 0.19 26.72)"
  oat-paper: "oklch(0.97 0.01 80.72)"
  oat-shade: "oklch(0.94 0.01 74.42)"
  umber-ink: "oklch(0.3 0.04 30.2)"
  umber-muted: "oklch(0.45 0.05 39.21)"
  oat-rule: "oklch(0.88 0.02 74.64)"
  white: "oklch(1 0 0)"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: "'tnum'"
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  figure:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    fontFeature: "'tnum'"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-green}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
    typography: "{typography.body}"
  button-outline:
    backgroundColor: "{colors.oat-paper}"
    textColor: "{colors.umber-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.sprout-tint}"
    textColor: "{colors.ledger-green-deep}"
  button-ghost-hover:
    backgroundColor: "{colors.sprout-tint}"
    textColor: "{colors.ledger-green-deep}"
  button-destructive:
    backgroundColor: "{colors.ledger-red}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.oat-paper}"
    textColor: "{colors.umber-ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.oat-paper}"
    textColor: "{colors.umber-ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  badge:
    backgroundColor: "{colors.ledger-green}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
    typography: "{typography.label}"
  segmented-control:
    backgroundColor: "{colors.oat-shade}"
    textColor: "{colors.umber-ink}"
    rounded: "{rounded.lg}"
    padding: "3px"
    height: "36px"
  segmented-control-item-checked:
    backgroundColor: "{colors.oat-paper}"
    textColor: "{colors.umber-ink}"
    rounded: "{rounded.md}"
  nav-item-active:
    backgroundColor: "{colors.oat-shade}"
    textColor: "{colors.umber-ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: FinTrack

## Overview

**Creative North Star: "The Kitchen-Table Ledger"**

FinTrack looks like a household's books spread out on a kitchen table: warm oat paper, umber ink, neat columns and one green pen for the things that matter. The books are checked by machine, so every figure is exact. The mood is **calm, warm and exact**. Nothing is urgent, nothing sparkles, and no number is ever ambiguous.

The canvas is warm rather than clinical white, the text is warm umber rather than black, and the dark mode is not an inverted grey. It moves into deep forest-green night tones (`oklch(0.27 0.03 150.77)` canvas), so the same ledger reads by lamplight. Ledger Green is the only accent that means "act here". Income and expense have their own semantic pair, and those colours never decorate anything.

Density sits in the middle. The interface is a daily tool (Operate mode), so structure comes from hairline borders and familiar controls rather than ornament. Controls should feel **tactile and confident**: clear states, firm focus rings and a definite press. This is a dependable instrument you handle every day.

**Key Characteristics:**
- Warm oat-paper canvas with umber ink, never pure white or pure black.
- A single action colour (Ledger Green), plus a strictly semantic money pair (income/expense).
- Border-first structure; shadows stay whisper-faint at rest.
- Inter throughout, with tabular figures wherever money aligns.
- Dark mode is a forest-night palette, not an inversion.

## Colors

The palette is a warm paper neutral family carrying one green ink, with a tightly fenced semantic set for money and risk.

### Primary
- **Ledger Green** (`ledger-green`): The ink of action. It's used for primary buttons, focus rings, the active sidebar accent, default badges and links. In dark mode it brightens to `oklch(0.67 0.16 144.21)` on forest-night surfaces.
- **Ledger Green Deep** (`ledger-green-deep`): Text on green tints, such as hover labels on outline and ghost buttons and secondary-button text. It's also the darker step of the chart ramp.

### Secondary
- **Sprout Wash** (`sprout-wash`): Barely-there green paper for secondary buttons and quiet selected regions.
- **Sprout Tint** (`sprout-tint`): The hover and accent wash. Outline and ghost controls turn this colour under the pointer, so the hover itself confirms "this is actionable".

### Tertiary (semantic only)
- **Income** (`income`, deep emerald): Money in. Positive amounts, income totals, up-arrows and under-budget health. In dark mode it becomes mint (`oklch(0.755 0.145 163.225)`).
- **Expense** (`expense`, deep rose): Money out. Negative amounts, expense totals, down-arrows and over-budget states. In dark mode it becomes soft coral-rose (`oklch(0.79 0.12 17.585)`).
- **Caution** (`caution`, burnt amber): Pins, warnings and nearing-budget states. In dark mode it becomes apricot (`oklch(0.785 0.145 58.318)`).
- **Ledger Red** (`ledger-red`): Destructive actions and validation errors only. Never use it for "expense". In dark mode it becomes salmon (`oklch(0.79 0.12 26.72)`) so it can be read as text, and fills switch to forest ink (`oklch(0.22 0.05 145.73)`) in place of white.

All four are tokens (`--income`, `--expense`, `--caution`, `--destructive`, used as `text-income` and so on). Each clears 4.5:1 as 14px text on every surface it can sit on in both modes. When a colour theme is active, `lib/semantic-colors.ts` keeps each money colour's hue and moves its lightness until it clears 4.5:1 on that theme's background, card, popover and muted surfaces. A unit test holds that true for every theme offered.

### Neutral
- **Oat Paper** (`oat-paper`): The canvas, and the background of cards and popovers. Cards are distinguished by their border, not by a different fill.
- **Oat Shade** (`oat-shade`): The active nav item, muted panels and the segmented-control track. It's one step darker than the paper.
- **Umber Ink** (`umber-ink`): All primary text.
- **Umber Muted** (`umber-muted`): Descriptions, metadata, sidebar section labels and placeholders.
- **Oat Rule** (`oat-rule`): Every border, divider and input stroke.

### Named Rules
**The One Green Pen Rule.** Ledger Green marks action and current focus, nothing else. If a screen has more than one green call to action, one of them is wrong.

**The Money Has Its Own Ink Rule.** Income and expense colours appear only on money that is moving in or out. They are never decoration, status or branding. Expense is rose, never Ledger Red: red means "destructive", rose means "spent".

### Charts
- **Money flows** (income/expense bars, the cash-flow Sankey) use `--income` and `--expense`, so a flow reads in the same ink as the amounts it sums.
- **A single series** (net worth, a debt's remaining balance) uses the `--chart-*` ramp. That ramp is one hue on purpose and follows the colour theme.
- **Comparing categories** uses `--category-1` to `--category-6` in a fixed order, plus a neutral `--category-other` for the catch-all bucket, which never takes a hue slot. Every categorical chart offers its table view too, so colour is never the only key.

**The No Literal Ink Rule.** A chart never carries a hex value. If a series needs a colour the tokens don't have, add the token, with both its light and dark steps.

### Colour themes
Besides FinTrack's own palette, people can pick from a short, curated list in `lib/theme-presets.ts`: Caffeine, Starry Night, Cosmic Night and Monochrome, adapted from tweakcn.com. They're offered as a personal preference, not as alternative identities.

**The Colour-Only Theme Rule.** A theme may change surfaces, text, the accent and the chart ramp, and nothing else. Type (self-hosted Inter), radius, shadows, the destructive colour and the money colours' meaning stay FinTrack's in every theme. A theme never loads a font or anything else from a third party.

**The Earn-Its-Place Rule.** A theme is offered only if every text/surface pair clears WCAG AA in both modes and its character fits a calm ledger. `theme-presets.test.ts` enforces the contrast and caps the list at six.

**The AA Ink Rule.** Every semantic colour is a token that clears 4.5:1 as body text on every surface it can sit on, in every theme. Never reach for a raw palette step (`text-rose-600`) to colour money or state.

**The Never Colour Alone Rule.** Every income or expense amount carries a direction cue (an up/down arrow or a sign) beside its colour. This keeps them legible for colour-blind readers and in print.

## Typography

**Display, body and label font:** Inter (variable 200–700, self-hosted at `/fonts/inter-regular.woff2`), falling back to the system sans-serif.
**Mono font:** Source Code Pro is declared but not shipped. Treat it as unavailable.

**Character:** a single neutral grotesque that behaves like a good bookkeeping hand: legible at 12px, steady in columns and invisible until a figure needs emphasis.

### Hierarchy
- **Display** (600, 2.25rem, tabular): The single amount being entered on Quick Add. It appears only where one figure is the whole screen.
- **Headline** (600, 1.5rem, tight tracking): Page titles.
- **Figure** (700, 1.5rem, tabular): Summary stat values in the dashboard cards (balance, income, expenses, savings rate).
- **Title** (600, 1rem, line-height 1): Card titles.
- **Body** (400–500, 0.875rem): The working size for nav items, table cells, form fields and buttons (500). Inputs render at 1rem on small screens to prevent iOS zoom, then 0.875rem from `md` up.
- **Label** (600, 0.75rem): Sidebar section labels, badges and metadata lines under list items, in Umber Muted.

### Named Rules
**The Tabular Money Rule.** Any amount that sits in a column, a stat or a running total uses tabular figures (`tabular-nums`) and is formatted through `CurrencyDisplay` and `Intl`. Never hand-place a currency symbol.

**The Fourteen-Pixel Floor Rule.** Body text in the app is 14px. 12px is reserved for labels and metadata, never for content someone has to read in full.

## Layout

- **App shell:**
  - A fixed left sidebar: 256px expanded, 80px collapsed to icons, hidden below `md` and opened as a 240px sheet.
  - A 56px top bar holding search (320px from `md`), currency, theme and notifications.
  - A scrolling main region.
- **Pages:** padded at 24px with 24px vertical gaps between sections.
- **Summary stats:** a four-up card grid that collapses to fewer columns on narrow viewports.
- **Spacing rhythm:** steps of 4/8/16/24px.
  - 8px separates a label from its field.
  - 16px separates related controls and form rows.
  - 24px is the card's inner padding and the gap between page sections.
- **Data:** lives in full-width tables with 40px header rows and horizontal scroll inside their own container rather than the page.
- **Mobile:** the PWA's Quick Add screen is single-column and thumb-first, with the amount field as the Display-size hero.

## Elevation & Depth

Depth is **border-first, barely lifted**. Structure comes from Oat Rule hairlines and the one-step tonal shift between Oat Paper and Oat Shade. At rest, cards and controls carry only a whisper of shadow (`shadow-xs`/`shadow-sm`, 5–10% black). Real lift is reserved for things that float above the ledger: popovers, menus, dialogs and sheets.

### Shadow Vocabulary
- **Whisper** (`box-shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.05)`): Buttons, inputs and outline controls at rest.
- **Rest** (`box-shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)`): Cards and the checked segment of a segmented control.
- **Float** (`box-shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 4px 6px -1px hsl(0 0% 0% / 0.1)`): Popovers, dropdown menus and the command palette.
- **Overlay** (`box-shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 8px 10px -1px hsl(0 0% 0% / 0.1)`): Dialogs and sheets.

### Named Rules
**The Paper Doesn't Float Rule.** Anything that's part of the ledger itself (cards, tables, stat tiles) stays at Rest or below. Only surfaces that sit *over* the ledger may cast a Float or Overlay shadow.

## Shapes

Gently rounded and consistent, from one 8px base radius (`--radius: 0.5rem`):

- **Cards:** the softest corner (12px).
- **Buttons, inputs, badges and nav items:** 6px.
- **Segmented-control track:** 8px.
- **Small inner pieces:** 4px.

Borders are always 1px Oat Rule hairlines. There are no pill shapes except avatars and icon discs, no sharp corners and no decorative borders.

## Components

### Buttons
Tactile and confident: a definite colour change on hover and a firm 3px focus ring.
- **Shape:** gently rounded (6px). Heights are 36px by default, 32px small, 40px large and a 36px square for icons. Icons inside are 16px with an 8px gap.
- **Primary:** Ledger Green fill, white 14px/500 label, Whisper shadow. Hover drops the fill to 90% opacity.
- **Outline:** Oat Paper fill with an Oat Rule border. Hover washes to Sprout Tint with Ledger Green Deep text. This is the workhorse for secondary actions such as "Open Reports" and "Quick Select".
- **Ghost:** no fill at rest, Sprout Tint on hover. Used for icon buttons in the top bar and sidebar.
- **Secondary:** a Sprout Wash fill with Ledger Green Deep text.
- **Destructive:** a Ledger Red fill with a `destructive-foreground` label (white in light mode, forest ink on salmon in dark mode). It's used only for irreversible actions behind a confirmation dialog. The fill is solid, never translucent, so contrast doesn't depend on what's underneath.
- **Focus:** every button shows a 3px ring at 50% Ledger Green and a Ledger Green border. Disabled buttons drop to 50% opacity with no pointer events.

### Inputs / Fields
- **Style:** a transparent fill over Oat Paper, a 1px Oat Rule stroke, 6px radius, 36px height, 12px horizontal padding and a Whisper shadow.
- **Focus:** the border turns Ledger Green, with a 3px ring at 50% Ledger Green.
- **Error:** `aria-invalid` turns the border Ledger Red with a 20% Ledger Red ring.
- **Disabled:** 50% opacity with a not-allowed cursor.
- **Selection:** highlighted text is Ledger Green with white text.

### Cards / Containers
- **Corner style:** 12px.
- **Background:** Oat Paper, the same as the canvas, set apart by a 1px Oat Rule border.
- **Shadow strategy:** Rest (see Elevation & Depth).
- **Internal padding:** 24px, with a 24px gap between header, content and footer.
- **Content:** the title is 600 weight, and the description sits underneath in Umber Muted 14px.

### Badges
- **Style:** 6px radius, 2px by 8px padding, 12px/500 label. The default is a Ledger Green fill. The secondary variant is Sprout Wash, the outline variant is a bare hairline, and the destructive variant is Ledger Red.

### Segmented Control
- **Style:** an Oat Shade track (8px radius, 3px inset) holding segments. The checked segment rises to Oat Paper with a Rest shadow.
- **Semantics:** built as a radio group, not as tabs. Use it when the choice changes the surrounding view. Use real Tabs only when there are panels to switch between.

### Navigation (sidebar)
- **Organised by household task, not by database object.** The sections are:
  - Home, with no heading.
  - **Spending:** Transactions, Quick add.
  - **Plan:** Budgets, Savings goals, Bills & repeating.
  - Accounts, with no heading.
  - **Reports:** Reports, Insights.
  - **Setup:** Categories, Rules, Import, Bank sync, Settings and Change history. Setup sits below a hairline and is visually quieter: chores come last.
- **Headings:** sentence case at 12px/500 in Umber Muted. Never all caps, never "Main menu".
- **Items:** 14px/500 with a 16px icon, 8px by 12px padding (12px vertical on touch screens) and a 6px radius. Hover shows an Oat Shade wash. The active item gets an Oat Shade fill and `aria-current="page"`.
- **Collapsed:** icons only, centred, at 80px wide, with the label kept for screen readers and as a tooltip.
- **Phone:** a bottom bar with Home · Spending · **+** · Plan · Accounts. The **+** is a 48px Ledger Green disc that opens Quick add in thumb reach. The full list stays in the left sheet, along with the language, colour theme and light/dark preferences.

### Home (signature surface)
Read top to bottom like a page of the household's books:
1. **The month in one sentence:** "$210.00 left to spend in October", with the number in tabular figures, and the envelope count and days left beneath it.
2. **Needs attention:** overspent envelopes, money ready to assign or over-assigned, and bills due within 7 days. Each row links to where you fix it. When nothing needs attention, it says one calm line: "Everything's on plan."
3. **Envelopes:** what's available in each, sorted so the ones needing attention come first.
4. **Recent entries:** grouped by day ("Today", "Yesterday", then dates), up to today only, with the payee as the label.
5. **Net worth:** as of today, with a 12-month sparkline drawn in SVG. Home never loads the chart library.

**The No Dashboard Rule.** Home never becomes a grid of equal stat cards with "% vs previous period". It answers one question, what's left this month, and says the rest in sentences.

### Envelope states
- **Over:** "$43.00 over" in Expense ink. It is the only red state, and it always has a way forward ("Cover…").
- **Spent as planned:** a check mark in Umber Muted. A fully spent envelope is done, not over budget by $0.00.
- **Running low:** under 15% left, with the amount in Caution ink.
- **Otherwise:** the available amount in Umber Ink.

**The Way Forward Rule.** Any figure shown as a problem links to, or offers, the action that fixes it.

### Error and empty states
- A failed request renders `LoadError`: what couldn't load, that the data is safe, and a retry. Inside a card it uses `inline` so it never puts a card inside a card.
- An empty state appears only after a successful empty response.

**The Errors Aren't Empty Rule.** "No transactions yet" after a failed request tells someone their records are gone. Never show it.

### Money Amount (signature component)
- **Display:** amounts are always formatted through `CurrencyDisplay` (Intl, the locale's grouping, the currency's own symbol placement) and always set in tabular figures.
- **In transaction lists:** amounts are right-aligned, with a 16px arrow (up in Income, down in Expense) beside an amount tinted the same colour.
- **In summary stats:** the Figure style is used. Only Income and Expense tiles take semantic colour. Balance and rates stay in Umber Ink.
- **Missing FX rate:** shown as "unavailable", never as a guessed number.

## Do's and Don'ts

### Do:
- **Do** use the CSS variables (`--primary`, `--muted`, `--border`, etc.) through Tailwind's semantic classes (`bg-primary`, `text-muted-foreground`, `border-border`) for everything except money direction.
- **Do** set every aligned amount in tabular figures and route it through `CurrencyDisplay`.
- **Do** colour money and budget state with `text-income`, `text-expense` and `text-caution`, and put `text-destructive-foreground` on any `bg-destructive` fill.
- **Do** pair income and expense colour with a direction arrow or sign.
- **Do** give every interactive control the 3px Ledger Green focus ring (`focus-visible:ring-[3px] ring-ring/50`).
- **Do** keep cards at Rest elevation with a hairline border; let tonal shift (Oat Paper to Oat Shade) do the layering.
- **Do** design dark mode as forest night: deep green surfaces, oat-tinted text and a brighter Ledger Green.
- **Do** respect `prefers-reduced-motion`. The global stylesheet already collapses animation and transition durations.

### Don't:
- **Don't** introduce pure white (`#fff`) or pure black surfaces or text. The paper is warm and the ink is umber.
- **Don't** use Ledger Red for expenses, or rose and emerald for anything that isn't money moving.
- **Don't** add a second accent hue for branding or decoration.
- **Don't** reach for raw Tailwind palette colours (`text-blue-500`, `bg-indigo-100`) in new work. Use a token, or add one.
- **Don't** lift ledger content (cards, tables, stats) above Rest elevation.
- **Don't** set readable content below 14px, or hand-format currency.
