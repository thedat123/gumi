// Đăng ký service worker (chỉ ở production build). SW tự viết ở public/sw.js.
export function registerSW() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return; // dev không cần SW (tránh cache gây khó debug)
  // First activation already runs the current build. Updates must not discard an active game.
  let hasController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  let waiting: MutationObserver | undefined;
  const reloadWhenIdle = () => {
    if (document.querySelector('[data-game-active="true"]')) return;
    waiting?.disconnect(); waiting = undefined;
    if (!refreshing) { refreshing = true; window.location.reload(); }
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasController) { hasController = true; return; }
    if (refreshing) return;
    if (document.querySelector('[data-game-active="true"]')) {
      if (!waiting) {
        waiting = new MutationObserver(reloadWhenIdle);
        waiting.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-game-active'] });
      }
    } else reloadWhenIdle();
  });
  window.addEventListener('load', () => {
    // updateViaCache:'none' → trình duyệt LUÔN tải sw.js từ mạng khi kiểm tra (bỏ qua HTTP cache)
    // → phát hiện deploy mới ngay cả trên PWA ĐÃ CÀI. (sw.js cũng đã no-cache ở _headers.)
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
      const check = () => reg.update().catch(() => { /* bỏ qua lỗi mạng */ });
      check(); // kiểm tra ngay khi mở
      // PWA đã cài thường KHÔNG tải lại trang → kiểm tra bản mới mỗi khi app QUAY LẠI TIỀN CẢNH.
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      // Phiên mở lâu (để app chạy nền) → kiểm tra định kỳ 30 phút.
      setInterval(check, 30 * 60 * 1000);
    }).catch(() => {
      // Không chặn app nếu SW lỗi.
    });
  });
}
