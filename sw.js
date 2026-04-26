// HUNTING CLAUDE — Service Worker v1.0
const CACHE_NAME = 'hunting-claude-v1';

// Todos los archivos que se cachean para uso offline
const ASSETS = [
  './index.html',
  './manifest.json',
  './sw.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap'
];

// ── INSTALL: cachear todo al instalar ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cachear assets locales siempre; fuentes best-effort
      return cache.addAll(['./index.html', './manifest.json', './sw.js'])
        .then(() => cache.add('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap').catch(() => {}));
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpiar caches antiguas ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first para assets locales, network-first para fuentes ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Para recursos locales: cache first
  if (url.origin === self.location.origin || event.request.url.startsWith('./')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Para Google Fonts: stale-while-revalidate
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Resto: network con fallback a cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
