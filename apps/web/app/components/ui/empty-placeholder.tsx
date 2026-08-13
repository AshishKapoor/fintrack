import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyPlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyPlaceholder({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-md border border-dashed p-8 text-center animate-in fade-in-50',
        className,
      )}
      {...props}
    >
      {icon && <div className="text-muted-foreground flex h-20 w-20 items-center justify-center rounded-full bg-muted">{icon}</div>}
      <div className="max-w-[420px] space-y-1">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}