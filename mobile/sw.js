const CACHE = 'mwc-v1';
const PRECACHE = [
  './',
  './chatm2.html',
  './icon-192.png',
  './icon-512.png'
];

// Install event: Pre-cache static assets for offline use
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate event: Clean up old cache versions & claim control immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch event: Apply network and caching strategies
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Pass-through for realtime, backend, and external API calls
  if (url.hostname.includes('trycloudflare.com') ||
      url.hostname.includes('appwrite.io') ||
      url.hostname.includes('socket.io') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  // Cache-first strategy for static CDN assets and web fonts
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

  // Network-first strategy for app page navigation (ensures updates load)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Default strategy: Network request with cache fallback
  e.respondWith(
    fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});

// Push event: Handle incoming system notifications
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
      tag: data.tag || 'mwc',
      data: data
    })
  );
});

// Notification click event: Focus open app window or launch app path
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});
