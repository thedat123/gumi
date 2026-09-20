/* Service worker tự viết cho Level Down (PWA). Đổi VERSION mỗi lần deploy để làm mới cache.
   Chiến lược: điều hướng (navigate) network-first + rơi về vỏ app đã cache khi offline;
   tài nguyên tĩnh cùng miền dùng stale-while-revalidate. Không đụng tới request khác miền (Supabase). */
const VERSION = 'ld-v1';
const OFFLINE_URL = '/offline.html';
const SHELL = ['/', OFFLINE_URL, '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(SHELL);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // để mạng lo Supabase và CDN ngoài

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const cache = await caches.open(VERSION);
          cache.put('/', net.clone());
          return net;
        } catch {
          const cache = await caches.open(VERSION);
          return (await cache.match('/')) || (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })(),
  );
});
