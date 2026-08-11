const CACHE = 'mwc-v1';
const PRECACHE = [
  './',
  './chatm2.html',
  './icon-192.png',
  './icon-512.png'
];

// Install event: Safe precaching that won't throw Uncaught TypeError
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      await Promise.allSettled(
        PRECACHE.map(async url => {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn('[SW] Could not cache file (check path/404):', url);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old cache versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first with cache fallback
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip caching for backend sockets & real-time APIs
  if (url.hostname.includes('trycloudflare.com') ||
      url.hostname.includes('appwrite.io') ||
      url.hostname.includes('socket.io') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});

// Push notification event
self.addEventListener('push', e => {
  if (!e.data) return;
  let data;
  try {
    data = e.data.json();
  } catch (err) {
    data = { title: 'MyWeb Chat', body: e.data.text() };
  }

  e.waitUntil(
    self.registration.showNotification(data.title || 'MyWeb Chat', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'mwc'
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});
