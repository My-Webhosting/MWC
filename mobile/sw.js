const CACHE = 'mwc-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Pass through socket.io and Appwrite API requests
  if (url.hostname.includes('trycloudflare.com') ||
      url.hostname.includes('appwrite.io') ||
      url.hostname.includes('socket.io') ||
      url.hostname.includes('googleapis.com')) {
    return; // let the browser handle it
  }
  // Cache-first for fonts and static CDN assets
  if (url.hostname.includes('jsdelivr.net') ||
      url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }))
    );
    return;
  }
  // Network-first for the app HTML itself
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Default: network with cache fallback
  e.respondWith(
    fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});

// Push notifications
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json().catch(() => ({ title: 'MyWeb Chat', body: e.data.text() }));
  e.waitUntil(
    data.then ? data.then(d => self.registration.showNotification(d.title || 'MyWeb Chat', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || 'mwc',
      data: d
    })) : self.registration.showNotification('MyWeb Chat', { body: e.data.text() })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    if (list.length) return list[0].focus();
    return clients.openWindow('/');
  }));
});
