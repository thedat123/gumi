import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { AppNotification } from '../api/types';

/** Thời gian tương đối ngắn gọn tiếng Việt. */
function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 172800) return 'hôm qua';
  return `${Math.floor(s / 86400)} ngày trước`;
}

/**
 * Chuông thông báo — trung tâm thông báo trong app. Đọc từ api.listNotifications() (nguồn: bảng
 * notifications do hệ thống ghi mỗi lần gửi nhắc). Badge số chưa đọc; mở ra đánh dấu đã đọc.
 * Nhờ đây người dùng LUÔN thấy noti đã bắn, kể cả khi noti OS không hiện.
 */
export function NotificationBell() {
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const unread = items.filter((n) => !n.read).length;

  const load = () => api.listNotifications().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  // Quay lại tab → nạp lại để thấy noti mới.
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);
  // Click ra ngoài → đóng.
  useEffect(() => {
    const h = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) { await api.markNotificationsRead().catch(() => {}); setItems((xs) => xs.map((n) => ({ ...n, read: true }))); }
  };
  const openItem = (n: AppNotification) => { setOpen(false); if (n.url) nav(n.url); };

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label={`Thông báo${unread ? ` (${unread} chưa đọc)` : ''}`} aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-pill border border-border bg-surface/80 text-muted shadow-soft backdrop-blur transition-colors hover:text-primary active:scale-95">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-on-primary shadow-soft">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-border bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-small font-bold">Thông báo</span>
            {items.length > 0 && <span className="text-caption text-muted">{items.length}</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-small text-muted">Chưa có thông báo nào.</p>
            ) : items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)}
                className={`flex w-full gap-2.5 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-primary/5 ${n.read ? '' : 'bg-primary/5'}`}>
                <img src="/icons/icon-192.png" alt="" aria-hidden="true" className="mt-0.5 h-8 w-8 shrink-0 rounded-[9px] shadow-soft ring-1 ring-border" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-small font-bold text-text">{n.title}</span>
                    {!n.read && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </span>
                  <span className="mt-0.5 block text-caption leading-relaxed text-muted">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-muted/70">{ago(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
