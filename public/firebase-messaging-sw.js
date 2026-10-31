// One service worker for the whole app: push notifications (Firebase) and an offline screen.
// The Firebase settings come in the address (?apiKey=…); without them only the offline part runs.
const params = new URL(self.location).searchParams;
if (params.get('apiKey')) {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
  firebase.initializeApp(Object.fromEntries(params));
  firebase.messaging();
}

const OFFLINE_PAGE = '/offline.html';
const CACHE = 'cerita-offline-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_PAGE, '/icon-192.png'])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cerita-offline-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Page loads: when there is no internet, show the friendly offline screen instead of an error.
// The logo on that screen also comes from the cache when offline. Everything else goes untouched.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_PAGE)));
  } else if (new URL(event.request.url).pathname === '/icon-192.png') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/icon-192.png')));
  }
});
