// src/store/useAppStore.ts
import { create } from 'zustand'

interface AppState {
  isDarkMode: boolean
  loading: boolean
  setDarkMode: (value: boolean) => void
  toggleDarkMode: () => void
  setLoading: (value: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: false,
  loading: false,

  setDarkMode: (value) => set({ isDarkMode: value }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setLoading: (value) => set({ loading: value }),
}))
