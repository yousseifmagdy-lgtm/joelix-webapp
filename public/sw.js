const CACHE_NAME = "joelix-game-v6";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/og-joelix.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isDevelopment = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";
  const isDevelopmentAsset = url.pathname.startsWith("/@") || url.pathname.startsWith("/__vite") || url.pathname.startsWith("/_vinext");

  // Development modules must always come from the running server. Caching the
  // Vite client leaves a stale offline page that floods the browser with HMR
  // errors whenever the local server restarts.
  if (isDevelopment || isDevelopmentAsset || event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // API and framework requests are live data and should never be served from
  // the offline asset cache.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  if (["font", "image"].includes(event.request.destination)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }))
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => "focus" in client);
      return existing ? existing.focus() : clients.openWindow("/");
    })
  );
});
