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

// Nhận WEB PUSH từ server (chạy cả khi app ĐÃ ĐÓNG) → hiện thông báo ra khay HĐH.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Level Down Challenge';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag || 'gumi-reminder',   // trùng tag → thay thế, không chồng thông báo
      renotify: true,
      requireInteraction: data.requireInteraction !== false, // bám lại đến khi người dùng tắt → dễ thấy, không tự ẩn sau ~5s
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
      lang: 'vi',
    }),
  );
});

// Trình duyệt xoay khoá subscription: báo các tab đang mở re-sync (client sẽ subscribe + lưu lại).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) client.postMessage({ type: 'push-resubscribe' });
    })(),
  );
});

// Bấm vào thông báo lời nhắc → đưa người dùng vào đúng chương trong ngày.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) { try { await client.navigate(url); } catch { /* cùng app, bỏ qua */ } }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
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
