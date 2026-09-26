// Service worker for the mobile deck viewer — offline-first.
// export-mobile.mjs rewrites 20260926012501 on every export, so a new publish
// busts the cache and the phone picks up fresh decks. Cache-first for instant/offline
// loads; the new SW only takes over when the page asks (SKIP_WAITING), so an update
// never yanks the page out from under the user mid-view.
const CACHE = `deckviewer-20260926012501`;
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

// cache: 'reload' — fetch every asset fresh from the server, bypassing the browser's HTTP cache.
// GitHub Pages serves max-age=600, so a plain addAll could store the PREVIOUS index.html (with the
// previous decks) under the new cache version when two exports land within 10 minutes; tapping
// "update" then showed stale swaps (2026-09-25: Garfield's Orim's Chant change didn't reach the phone).
self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).catch(() => {})));

self.addEventListener('activate', e =>
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(cached =>
    cached || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return resp;
    }).catch(() => cached)));
});
