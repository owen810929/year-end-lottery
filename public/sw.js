const CACHE_VERSION = "year-end-party-v1";
const CORE_FILES = ["./", "./index.html", "./manifest.json", "./icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_FILES.map((path) => new URL(path, self.registration.scope)))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const responseToCache = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, responseToCache));
        return response;
      });
    })
  );
});
