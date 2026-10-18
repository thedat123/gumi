// Đăng ký service worker (chỉ ở production build). SW tự viết ở public/sw.js.
export function registerSW() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return; // dev không cần SW (tránh cache gây khó debug)
  // SW mới (deploy mới) nắm quyền → TỰ reload MỘT lần để lấy bản mới sạch, khỏi phải tải tay.
  // Nhờ sw.js có skipWaiting + clients.claim nên controllerchange bắn ngay khi bản mới kích hoạt.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => { /* chủ động kiểm tra bản mới mỗi lần mở app */ });
    }).catch(() => {
      // Không chặn app nếu SW lỗi.
    });
  });
}
