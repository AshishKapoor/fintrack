import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

// Node 22+ defines its own global `localStorage` (backed by
// --localstorage-file, unset here) that throws on every access. jsdom ships a
// real, working implementation, but vitest's environment only copies a jsdom
// global over one Node already defines - so the broken native version wins,
// `window.localStorage` and bare `localStorage` both resolve to it (vitest
// aliases `window` to `globalThis`), and every test that touches storage
// fails before it runs. vitest still exposes the real jsdom instance
// separately as `globalThis.jsdom`, so pull the working implementation from
// there instead and force it into place.
declare global {
  // eslint-disable-next-line no-var
  var jsdom: { window: { localStorage: Storage } } | undefined
}

const realLocalStorage = globalThis.jsdom?.window?.localStorage
if (realLocalStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: realLocalStorage,
    configurable: true,
  })
}

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
