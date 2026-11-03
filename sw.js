// Offline support. Serves from cache, then refreshes the cache in the background,
// so a new deploy shows up on the next visit. Bump VERSION to force a clean cache.
const VERSION = 'oye-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './words.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './fonts/gentium-book-plus-latin-400-normal.woff2',
  './fonts/gentium-book-plus-latin-ext-400-normal.woff2',
  './fonts/andika-latin-400-normal.woff2',
  './fonts/andika-latin-700-normal.woff2',
  './fonts/andika-latin-ext-400-normal.woff2',
  './fonts/andika-latin-ext-700-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req)
        .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
