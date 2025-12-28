const CACHE_NAME = 'rgfl-survivor-v1';
const urlsToCache = [
  '/',
  '/images/logo/rgfl-logo.png',
  '/images/logo/icon-192.png',
  '/images/logo/icon-512.png'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('PWA: Cache opened');
        return cache.addAll(urlsToCache).catch((err) => {
          console.error('PWA: Failed to cache resources', err);
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first for API, cache for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache API requests or socket.io
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    event.respondWith(fetch(request));
    return;
  }

  // For other requests: network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful GET requests for same origin
        if (request.method === 'GET' && response.status === 200 && url.origin === location.origin) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          throw new Error('Network request failed and no cache available');
        });
      })
  );
});
