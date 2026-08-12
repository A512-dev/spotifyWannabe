const CACHE_NAME = "spotifywannabe-static-v2";
const CACHE_PREFIX = "spotifywannabe-static-";
const STATIC_ASSET_PATH = /\/(?:_next\/static\/|.*\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?))$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || !STATIC_ASSET_PATH.test(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        if (response.ok) {
          const responseForCache = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseForCache));
        }
        return response;
      });
    })
  );
});
