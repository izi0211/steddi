// Lets T1Dy open without signal. AI calls always go to the network.
const C = 't1dy-v12';
const FILES = ['./', 'index.html', 'shim.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); self.skipWaiting() });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))); self.clients.claim() });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/')) return;
  // Network first so testers always get the latest version; cache as backup.
  e.respondWith(fetch(e.request).then(r => { if (u.origin === location.origin) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)) } return r })
    .catch(() => caches.match(e.request)));
});
