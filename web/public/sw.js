const VERSION = 'fintrack-v1-pwa-20260310'
const APP_SHELL_CACHE = `${VERSION}-app-shell`
const APP_SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest', '/favicon.ico']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request).then((cached) => cached || Response.error())),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match('/index.html'))
    }),
  )
})
