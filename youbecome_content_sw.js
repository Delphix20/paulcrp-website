"use strict";

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { payload = {}; }
  const notification = payload.notification || payload;
  const title = notification.title || "You Become Content Studio";
  const navigate = notification.navigate || notification.url || "/youbecome_content.html";
  event.waitUntil(self.registration.showNotification(title, {
    body: notification.body || "A post is ready for its final Instagram step.",
    tag: notification.tag || "you-become-publishing-reminder",
    icon: "/assets/youbecome-studio-icon-192.png",
    badge: "/assets/youbecome-studio-icon-192.png",
    data: { url: navigate }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetURL = new URL(event.notification.data?.url || "/youbecome_content.html", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(targetURL);
      return client.focus();
    }
    return clients.openWindow(targetURL);
  }));
});
