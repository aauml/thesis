// Service Worker — must live in repo root.
// A SW's scope is limited to its directory and below.
// Moving it to pwa/sw.js would restrict its scope to /thesis/pwa/
// and it wouldn't be able to cache /thesis/dashboard.html.

const CACHE = 'thesis-v15';

// Assets that rarely change → cache-first (fast offline loads)
const STATIC_ASSETS = [
  '/thesis/pwa/manifest.json',
  '/thesis/pwa/icon-192.png',
  '/thesis/pwa/icon-512.png',
  '/thesis/pwa/apple-touch-icon.png'
];

// Pages/HTML that change often → network-first (always fresh)
const NETWORK_FIRST = [
  '/thesis/dashboard.html',
  '/thesis/index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isNetworkFirst = NETWORK_FIRST.some(p => url.pathname.endsWith(p));

  if (isNetworkFirst) {
    // Network-first: always try fresh, fall back to cache offline
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first: fast load for static assets, update in background
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
