import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  // Cookies persist across jsdom tests otherwise, so auth state leaks between them.
  document.cookie.split('; ').forEach((entry) => {
    const name = entry.split('=')[0]
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
  })
})

afterEach(() => {
  cleanup()
})
