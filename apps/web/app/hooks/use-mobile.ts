import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

export function useIsMobile() {
  // useSyncExternalStore reads the current value during render and stays
  // subscribed, without the mount-time setState the old version relied on.
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
