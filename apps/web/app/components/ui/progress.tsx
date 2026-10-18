import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

/**
 * A determinate progress bar.
 *
 * `value` is clamped into `0..max` before it reaches Radix: an out-of-range
 * value (a category 108% spent) makes Radix treat the bar as indeterminate and
 * drop `aria-valuenow`, so a screen reader hears no progress at all. When the
 * real figure differs from what the bar can show, say it with `getValueLabel`,
 * which becomes `aria-valuetext`. Give every bar an accessible name too
 * (`aria-label` or `aria-labelledby`).
 */
function Progress({
  className,
  indicatorClassName,
  value,
  max = 100,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  /** Fill colour for the bar, e.g. `bg-expense` when over budget. */
  indicatorClassName?: string
}) {
  const clamped =
    value == null || Number.isNaN(value) ? null : Math.min(max, Math.max(0, value))
  const percent = clamped == null ? 0 : (clamped / max) * 100

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      value={clamped}
      max={max}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("bg-primary h-full w-full flex-1 transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
