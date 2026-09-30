import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './room.css';
import './game.css';
import { App } from './App';
import { registerSW } from './pwa';
import { applyGfxClass } from './lib/quality';

applyGfxClass(); // gắn hạng đồ hoạ (gfx-low|mid|high) lên <html> để CSS + cảnh 3D hạ tải theo máy

// Preconnect Supabase NGAY khi tải HTML → tiết kiệm DNS + TLS cho lần gọi auth/API đầu tiên.
const sbUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
if (sbUrl) {
  for (const rel of ['preconnect', 'dns-prefetch']) {
    const l = document.createElement('link');
    l.rel = rel; l.href = sbUrl; l.crossOrigin = 'anonymous';
    document.head.appendChild(l);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

registerSW();

// Lúc máy rảnh sau lần vẽ đầu: tải trước các chunk route hay dùng để ĐIỀU HƯỚNG trong app tức thì
// (không tranh băng thông với màn đầu — chỉ chạy khi trình duyệt idle).
const idle = (cb: () => void) =>
  (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback?.(cb)
  ?? setTimeout(cb, 1800);
idle(() => {
  void import('./pages/Dashboard');
  void import('./pages/Leaderboard');
  void import('./pages/GumiRoom');
});
