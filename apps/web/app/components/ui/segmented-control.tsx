'use client'

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * A one-of-N picker that reconfigures the view below it.
 *
 * Looks exactly like `TabsList`/`TabsTrigger`, and is deliberately not built on
 * them. Radix's `Tabs.Trigger` renders `role="tab"` with an `aria-controls`
 * pointing at a `Tabs.Content` panel; used as a segmented control - triggers
 * with no panels - that attribute references an element that does not exist,
 * which is an `aria-valid-attr-value` failure and, more to the point, tells a
 * screen reader user there is a panel to jump to when there is not.
 *
 * A radio group is what this control actually is: pick one, everything else
 * updates. Arrow-key navigation and roving focus come from Radix either way.
 *
 * Use `Tabs` when there really are panels; use this when the selection just
 * changes what the surrounding component renders.
 */

function SegmentedControl({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot='segmented-control'
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
        className,
      )}
      {...props}
    />
  )
}

function SegmentedControlItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot='segmented-control-item'
      className={cn(
        "data-[state=checked]:bg-background dark:data-[state=checked]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=checked]:border-input dark:data-[state=checked]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  )
}

export { SegmentedControl, SegmentedControlItem }
