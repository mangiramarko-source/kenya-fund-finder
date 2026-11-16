const OFFLINE_CACHE = "kff-offline-v2";
const OFFLINE_URL = "/offline";

async function toCleanResponse(response) {
  if (!response.redirected) {
    return response;
  }
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

self.addEventListener("install", (event) => {
  // Precache ONLY the standalone, zero-dependency /offline page.
  // Never precache index.html so Vite hashed /assets/* bundles cannot go stale.
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then(async (cache) => {
        const response = await fetch(new Request(OFFLINE_URL, { cache: "reload" }));
        if (!response.ok) {
          throw new Error(`Offline precache failed: ${response.status}`);
        }
        const cleanResponse = await toCleanResponse(response);
        await cache.put(OFFLINE_URL, cleanResponse);
      })
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
      if (cachedOffline) {
        return toCleanResponse(cachedOffline);
      }
      return new Response(
        "<!doctype html><html><body style='background:#09090b;color:#fff;font-family:sans-serif;text-align:center;padding:48px'><h1>You are offline</h1><p>Please check your internet connection and try again.</p></body></html>",
        {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
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
