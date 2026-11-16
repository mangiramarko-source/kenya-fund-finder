const OFFLINE_CACHE = "kff-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  // Precache ONLY the standalone, zero-dependency /offline.html page.
  // Never precache index.html so Vite hashed /assets/* bundles cannot go stale.
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("kff-offline-") && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      const cachedOffline = await cache.match(OFFLINE_URL);
      return (
        cachedOffline ||
        new Response(
          "<!doctype html><html><body style='background:#09090b;color:#fff;font-family:sans-serif;text-align:center;padding:48px'><h1>You are offline</h1><p>Please check your internet connection and try again.</p></body></html>",
          {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }
        )
      );
    })
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(payload.title || "Kenya Fund Finder", {
      body: payload.body || "You have a new market alert.",
      icon: "/icon-192.png?v=20261111",
      badge: "/favicon.ico?v=20261111",
      tag: payload.tag || "kff-notification",
      data: { url: payload.url || "/alerts" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/alerts"));
});
