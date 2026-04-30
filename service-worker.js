// Bump the cache name to invalidate old caches when deploying new features (grid overlay etc.)
const CACHE_NAME = 'fishtrack-v26-premium-badges-companion';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './catches.json',
  './coach.png',
  './final_big_coach_rules.json',
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
// MATRIX SCALING PATCH
function scaleWholeMatrix(){const w=document.querySelector('.matrix-wrapper');const c=document.querySelector('.matrix-content');if(!w||!c)return;c.style.transform='translate(-50%,-50%) scale(1)';const s=Math.min(w.clientWidth/c.scrollWidth,w.clientHeight/c.scrollHeight,1);c.style.transform=`translate(-50%,-50%) scale(${s})`;}window.addEventListener('resize',scaleWholeMatrix);requestAnimationFrame(scaleWholeMatrix);
