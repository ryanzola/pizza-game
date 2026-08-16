const CACHE_VERSION = 'v1';

// Immediately take control on install
self.addEventListener('install', function(event) {
  console.log('Service Worker Installing...');
  self.skipWaiting();
});

// Claim all clients on activate + clear old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker Activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_VERSION) {
            console.log('Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Network-first: always fetch from network, no caching
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      // If offline, try cache as fallback
      return caches.match(event.request);
    })
  );
});
