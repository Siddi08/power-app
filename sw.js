const CACHE = 'power-v2';

// Install: pre-cache shell so offline works from the very first visit
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(['./', './index.html', './manifest.json', './sw.js'])
    )
  );
  self.skipWaiting(); // activate immediately, don't wait for old tabs to close
});

// Activate: delete every previous cache version, then seize all open tabs
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // take control of every open tab
      .then(async () => {
        // Tell every open tab to reload so it gets the fresh version instantly
        const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        all.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
      })
  );
});

// Fetch: network-first.
// Online  → always fetch fresh from server, update cache, return response.
// Offline → fall back to whatever is cached.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache a clone of every successful response for offline use
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        // Network failed (offline) — serve from cache
        caches.match(e.request).then(cached =>
          cached || new Response('You are offline and this page is not cached yet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          })
        )
      )
  );
});
