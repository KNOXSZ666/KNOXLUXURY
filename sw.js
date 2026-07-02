// =============================================
// KNOX SHOP - SERVICE WORKER (sw.js)
// PWA - Cache offline assets
// =============================================

const CACHE_NAME = 'knox-shop-v1';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './app.js',
  './lang.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets...');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Bỏ qua các request không phải GET
  if (event.request.method !== 'GET') return;

  // Bỏ qua các request đến Supabase (API)
  if (event.request.url.includes('supabase.co')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(event.request)
          .then(response => {
            // Cache các response thành công
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                try {
                  cache.put(event.request, clone);
                } catch(e) {
                  // Bỏ qua lỗi cache
                }
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback cho offline
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Offline - Vui lòng kiểm tra kết nối', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
