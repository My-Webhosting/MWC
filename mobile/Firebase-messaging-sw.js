/**
 * firebase-messaging-sw.js
 * Firebase Cloud Messaging service worker — handles background push notifications.
 *
 * IMPORTANT: This file must live at the ROOT of your web server (same origin as the app).
 *            The Firebase config here must match what's in index.html / index2.html.
 *
 * Replace all YOUR_* placeholders with the same values you used in the HTML files.
 */

// ── Import Firebase compat SDK (works in SW scope) ───────────
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Firebase config — MUST match the HTML files ───────────────
firebase.initializeApp({
  apiKey:            'AIzaSyBzewj5fDbxcUfFVny3WpRnN64jmNCDWWo',
  authDomain:        'simple3mwc.firebaseapp.com',
  projectId:         'simple3mwc',
  storageBucket:     'simple3mwc.firebasestorage.app',
  messagingSenderId: '297353599931',
  appId:             '1:297353599931:web:98d4da815a29331e62829e',
});

const messaging = firebase.messaging();

/**
 * Background message handler.
 * FCM calls this when the app is closed or in the background.
 * If you send a notification payload from the server, FCM auto-displays it.
 * This handler fires for data-only payloads so you can customise the notification.
 */
messaging.onBackgroundMessage(payload => {
  console.log('[FCM SW] Background message received:', payload);

  const { title = 'MyWeb Chat', body = 'You have a new message' } =
    payload.notification || {};

  // data fields set by server.js pushNotification()
  const { type, ref, notifId } = payload.data || {};

  self.registration.showNotification(title, {
    body,
    icon:   '/favicon.ico',
    badge:  '/favicon.ico',
    tag:    notifId || `mwc-${Date.now()}`,
    renotify: true,
    data: { type, ref, notifId, url: self.location.origin },
  });
});

/**
 * Notification click handler — brings the app to the foreground
 * and (when possible) navigates to the relevant conversation.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const { url, type, ref } = event.notification.data || {};
  const target = url || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus an existing window if possible
      for (const client of windowClients) {
        if (client.url.startsWith(target) && 'focus' in client) {
          client.focus();
          // Tell the page to open the right convo / panel
          if (type === 'message' && ref) client.postMessage({ action: 'open_convo', convoId: ref });
          else if (type === 'friend_request') client.postMessage({ action: 'open_friends' });
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
