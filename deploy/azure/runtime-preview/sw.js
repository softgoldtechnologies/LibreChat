self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (key) { return caches.delete(key); }));
      await self.registration.unregister();
      var windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(windows.map(function (client) { return client.navigate(client.url); }));
    })(),
  );
});
