/*
  Service worker. Drží push notifikace.

  Schválně tu není žádná cache: aplikace je za přihlášením a ukazuje denní
  data. Offline kopie odškrtaných návyků by byla horší než chybová hláška —
  člověk by odškrtával do prázdna a myslel si, že je uloženo.
*/

self.addEventListener("install", () => {
  // Nový worker nemá čekat, až se zavřou všechny záložky.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Práce na sobě", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Práce na sobě";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Stejný tag přepíše předchozí notifikaci místo toho, aby se hromadily.
      tag: payload.tag || "na-sobe",
      data: { url: payload.url || "/" },
      requireInteraction: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Když aplikace už běží, jen ji vytáhneme dopředu — druhé okno
        // by znamenalo druhou přihlášenou relaci.
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
