const VERSION = 'v8';
const CACHE = 'etichette-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './app.js',
  './core.js',
  './pdf.min.mjs',
  './pdf.worker.min.mjs',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(u => cache.add(u).catch(err => console.warn('[sw] cache miss', u, err))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const networkPromise = fetch(req).then(res => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) return cached;
    const fresh = await networkPromise;
    if (fresh) return fresh;
    return new Response('Offline', { status: 503 });
  })());
});
