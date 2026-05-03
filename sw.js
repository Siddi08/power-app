const CACHE = 'power-v3';

// Install: no pre-caching — the network-first fetch handler keeps content
// fresh on its own. Pre-caching a hardcoded file list caused stale HTML
// to persist after deployments because the cache name never changed.
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Activate: delete every old cache version and seize all open tabs.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Navigation requests (the HTML document itself): always revalidate with
  // the server using cache:'no-cache'. This bypasses the browser's own HTTP
  // cache, so a freshly deployed index.html is served immediately even when
  // the server hasn't changed its Cache-Control headers.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request.url, { cache: 'no-cache' })
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(r =>
            r || new Response('You are offline and this page is not cached yet.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          )
        )
    );
    return;
  }

  // All other GET requests (manifest, icons, fonts…): network-first with
  // cache fallback for offline use.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(r =>
          r || new Response('Offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
  );
});
