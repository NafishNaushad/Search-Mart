// Minimal service worker for PWA install + safe offline caching
// IMPORTANT: Only cache core static assets and same-origin requests.
// Do NOT cache cross-origin (e.g., Supabase storage, external images) to avoid stale UI/data.

// Dynamic cache version based on build timestamp - ensures instant updates
const BUILD_TIMESTAMP = '__BUILD_TIMESTAMP__'; // Will be replaced during build
const CACHE_NAME = `searchmart-cache-${BUILD_TIMESTAMP}`;
const ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => null)
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker with cache:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log('[SW] Found existing caches:', keys);
      // Delete ALL old caches to ensure fresh start
      const deletePromises = keys
        .filter(k => k.startsWith('searchmart-cache-') && k !== CACHE_NAME)
        .map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        });
      return Promise.all(deletePromises);
    }).then(() => {
      console.log('[SW] All old caches cleared, claiming clients');
      // Force all clients to use new SW immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients to reload for instant update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', cacheName: CACHE_NAME });
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isSupabase = url.hostname.includes('supabase.co') || url.pathname.includes('/storage/v1/object');

  // Never cache cross-origin or Supabase/storage requests
  if (!sameOrigin || isSupabase) return;

  // Cache-first for same-origin static requests only
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((resp) => {
        // Only cache successful basic responses
        if (resp && resp.ok && resp.type === 'basic') {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone)).catch(() => {});
        }
        return resp;
      }).catch(() => cached)
    )
  );
});
