// JobFitwise service worker: only an offline page. Nothing else is cached, so the app
// always shows live data. (Google requires apps from the web to handle being offline.)
const CACHE = "jobfitwise-offline-v2";
const OFFLINE = "/offline.html";
const OFFLINE_ASSETS = [OFFLINE, "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE_ASSETS.map((u) => new Request(u, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
  } else if (url.origin === self.location.origin && url.pathname === "/icon-192.png") {
    // The offline page's logo: network first, the saved copy when offline.
    event.respondWith(fetch(event.request).catch(() => caches.match("/icon-192.png")));
  }
});
