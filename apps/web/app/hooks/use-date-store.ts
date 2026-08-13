import { create } from 'zustand'
import { type DateRange } from 'react-day-picker'
import { addDays, subDays } from 'date-fns'

interface DateState {
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
  resetToDefault: () => void
  setToday: () => void
  setThisWeek: () => void
  setThisMonth: () => void
  setLast30Days: () => void
}

const getDefaultDateRange = (): DateRange => {
  const today = new Date()
  return {
    from: subDays(today, 30),
    to: today,
  }
}

export const useDateStore = create<DateState>((set) => ({
  dateRange: getDefaultDateRange(),

  setDateRange: (range) => set({ dateRange: range }),
  
  resetToDefault: () => set({ dateRange: getDefaultDateRange() }),
  
  setToday: () => {
    const today = new Date()
    set({ 
      dateRange: { 
        from: today, 
        to: today 
      } 
    })
  },
  
  setThisWeek: () => {
    const today = new Date()
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    const endOfWeek = addDays(startOfWeek, 6)
    set({ 
      dateRange: { 
        from: startOfWeek, 
        to: endOfWeek 
      } 
    })
  },
  
  setThisMonth: () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    set({ 
      dateRange: { 
        from: startOfMonth, 
        to: endOfMonth 
      } 
    })
  },
  
  setLast30Days: () => {
    const today = new Date()
    set({ 
      dateRange: { 
        from: subDays(today, 30), 
        to: today 
      } 
    })
  },
}))
