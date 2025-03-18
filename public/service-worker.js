// No caching service worker
self.addEventListener('install', (event) => {
  // Skip the "waiting" lifecycle state, to go directly from "installed" to "activating"
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Clear any existing caches
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
      .catch((error) => console.error('Cache cleanup failed:', error))
  );
});

// Network-only fetch strategy
self.addEventListener('fetch', (event) => {
  // Pass through all fetch requests directly to the network
  // This effectively disables caching functionality
  return;
});

// Push notification handling - keeping this functionality
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Doo!Du', options)
      .catch((error) => console.error('Push notification failed:', error))
  );
});