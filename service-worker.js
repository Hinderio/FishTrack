// Bump the cache name to invalidate old caches when deploying new features (grid overlay etc.)
const CACHE_NAME = 'fishtrack-v20-zone-names';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './catches.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      return (
        cached ||
        fetch(event.request)
          .then(response => {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone))
              .catch(() => {});
            return response;
          })
          .catch(() => caches.match('./index.html'))
      );
    })
  );
});