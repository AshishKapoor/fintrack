'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDateStore } from '@/hooks/use-date-store'

export function DatePickerWithRange({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const {
    dateRange,
    setDateRange,
    setToday,
    setThisWeek,
    setThisMonth,
    setLast30Days,
    resetToDefault,
  } = useDateStore()

  return (
    <div className={cn('grid gap-2', className)}>
      <div className='flex gap-2'>
        {/* Quick Date Selection Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='default'>
              Quick Select
              <ChevronDownIcon className='ml-2 h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={setToday}>Today</DropdownMenuItem>
            <DropdownMenuItem onClick={setThisWeek}>This Week</DropdownMenuItem>
            <DropdownMenuItem onClick={setThisMonth}>This Month</DropdownMenuItem>
            <DropdownMenuItem onClick={setLast30Days}>Last 30 Days</DropdownMenuItem>
            <DropdownMenuItem onClick={resetToDefault}>Reset to Default</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id='date'
              variant={'outline'}
              className={cn(
                'w-[300px] justify-start text-left font-normal',
                !dateRange && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              mode='range'
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
