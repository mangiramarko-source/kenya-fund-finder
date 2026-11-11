self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(payload.title || "Kenya Fund Finder", {
    body: payload.body || "You have a new market alert.",
    icon: "/icon-192.png?v=20261111",
    badge: "/favicon.ico?v=20261111",
    tag: payload.tag || "kff-notification",
    data: { url: payload.url || "/alerts" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/alerts"));
});
