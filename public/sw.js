
const CACHE_NAME = 'vulnscan-pro-v2';
const ASSETS = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API Requests: Network First (or handled by app logic fallback)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation Requests (HTML): Network First, Fallback to Cache (App Shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Static Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((fetchRes) => {
        // Cache valid responses for next time
        if (fetchRes.ok && event.request.method === 'GET') {
             const resClone = fetchRes.clone();
             caches.open(CACHE_NAME).then((cache) => {
                 cache.put(event.request, resClone);
             });
        }
        return fetchRes;
      }).catch(() => {
         // Network failed, if we don't have cached, nothing we can do for assets
      });

      return cached || fetched;
    })
  );
});
