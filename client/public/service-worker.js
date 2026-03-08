/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: data.url || '/',
      vibrate: [100, 50, 100],
      tag: data.tag || 'eternal-idle-notification',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Eternal Idle', options)
    );
  } catch (e) {
    console.error('Error in push event:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || '/');
      }
    })
  );
});
