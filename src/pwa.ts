// Đăng ký service worker (chỉ ở production build). SW tự viết ở public/sw.js.
export function registerSW() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return; // dev không cần SW (tránh cache gây khó debug)
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Không chặn app nếu SW lỗi.
    });
  });
}
