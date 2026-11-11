import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import './index.css';
import { registerSW } from './pwa';
import { applyGfxClass, isSlowNetwork, startAdaptiveQuality, startCrashGuard } from './lib/quality';
import { RootErrorBoundary, reloadOnce } from './components/RootErrorBoundary';

applyGfxClass(); // gắn hạng đồ hoạ (gfx-low|mid|high) lên <html> để CSS + cảnh 3D hạ tải theo máy
startAdaptiveQuality(); // tự hạ hạng nếu máy khựng thật (bắt cả máy dò nhầm là khoẻ)
startCrashGuard(); // lần trước bị crash → lần này tự vào chế độ nhẹ nhất

// Deploy mới xoá chunk cũ → import() lỗi → tải lại trang 1 lần thay vì trắng màn.
window.addEventListener('vite:preloadError', (e) => { if (reloadOnce()) e.preventDefault(); });

// Preconnect Supabase NGAY khi tải HTML → tiết kiệm DNS + TLS cho lần gọi auth/API đầu tiên.
const sbUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
if (sbUrl) {
  for (const rel of ['preconnect', 'dns-prefetch']) {
    const l = document.createElement('link');
    l.rel = rel; l.href = sbUrl; l.crossOrigin = 'anonymous';
    document.head.appendChild(l);
  }
}

// QR players load only the event route: no auth/profile, furniture or 3D app.
const FullApp = lazy(() => import('./App').then(module => ({ default: module.App })));
const PublicEvent = lazy(() => import('./pages/event/EventGame').then(module => ({ default: module.EventGame })));
function EntryRoute() {
  const { pathname } = useLocation();
  return <Suspense fallback={<div role="status" style={{ padding: 32, textAlign: 'center' }}>Đang tải…</div>}>
    {/^\/play\/?$/.test(pathname) ? <PublicEvent/> : <FullApp/>}
  </Suspense>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <EntryRoute />
      </BrowserRouter>
    </RootErrorBoundary>
  </StrictMode>,
);

registerSW();

// TẢI NỀN KHI MÁY RẢNH (để trình duyệt tự lo, không chặn màn đang mở):
// mỗi lần rảnh chỉ nạp MỘT chunk màn → không có "long task" nào làm A32 khựng; bấm sang màn nào cũng đã có sẵn code.
// Mạng 3G / tiết kiệm dữ liệu: bỏ → nhường băng thông cho màn đang mở.
type IdleCb = (d?: { timeRemaining(): number }) => void;
const idle = (cb: IdleCb) =>
  (window as unknown as { requestIdleCallback?: (cb: IdleCb, o?: { timeout: number }) => void }).requestIdleCallback?.(cb, { timeout: 4000 })
  ?? setTimeout(cb, 1200);
if (!isSlowNetwork() && !/^\/(event|play|mission)(\/|$)/.test(window.location.pathname)) {
  const queue: Array<() => Promise<unknown>> = [
    () => import('./pages/GumiRoom'),
    () => import('./api').then(({ api }) => import('./app/useAsync').then(({ prefetchAsync }) => api.auth.getSession().then((s) => {
      if (!s) return; // chưa đăng nhập: không gọi API dữ liệu
      return Promise.all([prefetchAsync('journey', () => api.getJourney()), prefetchAsync('leaderboard', () => api.getLeaderboard())])
        .then(() => prefetchAsync('summary', () => api.getSummary()));
    }))),
    () => import('./pages/Dashboard'),
    () => import('./pages/ChapterIntro'),
    () => import('./pages/Leaderboard'),
    () => import('./pages/Profile'),
    () => import('./pages/Summary'),
    () => import('./pages/MissionRouter'),
  ];
  const next = () => {
    const job = queue.shift();
    if (!job) return;
    job().catch(() => { /* mạng lỗi: màn đó sẽ tải lúc mở */ }).finally(() => idle(next));
  };
  // Chờ màn đầu vẽ xong rồi mới bắt đầu.
  window.addEventListener('load', () => idle(next), { once: true });
}
