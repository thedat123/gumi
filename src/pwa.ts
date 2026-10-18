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
