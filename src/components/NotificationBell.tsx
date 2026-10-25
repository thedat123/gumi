import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { AppNotification } from '../api/types';
import { timeAgo } from '../lib/timeAgo';

/**
 * Chuông thông báo — trung tâm thông báo trong app. Đọc từ api.listNotifications() (nguồn: bảng
 * notifications do hệ thống ghi mỗi lần gửi nhắc). Badge số chưa đọc; mở ra đánh dấu đã đọc.
 * Nhờ đây người dùng LUÔN thấy noti đã bắn, kể cả khi noti OS không hiện.
 */
export function NotificationBell() {
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [position, setPosition] = useState<CSSProperties>({});
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
    const h = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, []);

  // Portal avoids the header's backdrop-filter containing block and room stacking layers.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = buttonRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const offsetLeft = viewport?.offsetLeft ?? 0;
      const offsetTop = viewport?.offsetTop ?? 0;
      const panelWidth = Math.min(360, width - 24);
      const top = Math.max(offsetTop + 12, Math.min(anchor.bottom + 10, offsetTop + height - 140));
      setPosition({
        width: panelWidth,
        left: Math.max(offsetLeft + 12, Math.min(anchor.right - panelWidth, offsetLeft + width - panelWidth - 12)),
        top,
        maxHeight: Math.max(100, offsetTop + height - top - 16),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) { await api.markNotificationsRead().catch(() => {}); setItems((xs) => xs.map((n) => ({ ...n, read: true }))); }
  };
  const openItem = (n: AppNotification) => { setOpen(false); if (n.url) nav(n.url); };

  return (
    <div ref={ref} className="relative">
      <button ref={buttonRef} onClick={toggle} aria-label={`Thông báo${unread ? ` (${unread} chưa đọc)` : ''}`} aria-expanded={open} aria-controls={open ? panelId : undefined}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-pill border border-border bg-surface/80 text-muted shadow-soft backdrop-blur transition-colors hover:text-primary active:scale-95">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {items.length > 0 && <span className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black shadow-soft ${unread > 0 ? 'bg-primary text-on-primary' : 'bg-border-strong/70 text-surface'}`}>{items.length > 9 ? '9+' : items.length}</span>}
      </button>

      {open && createPortal(
        <div ref={panelRef} id={panelId} role="dialog" aria-label="Thông báo" tabIndex={-1} style={position}
          className="notification-panel fixed z-[4000] flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-pop outline-none">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-small font-bold">Thông báo</span>
            <div className="flex items-center gap-3">
              {items.length > 0 && <span className="text-caption text-muted">{items.length}</span>}
              <button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} aria-label="Đóng thông báo" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-primary/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-small text-muted">Chưa có thông báo nào.</p>
            ) : items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)}
                className={`flex w-full gap-2.5 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-primary/5 ${n.read ? '' : 'bg-primary/5'}`}>
                <img src="/icons/icon-192.png?v=20261014" alt="" aria-hidden="true" className="mt-0.5 h-8 w-8 shrink-0 rounded-[9px] shadow-soft ring-1 ring-border" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-small font-bold text-text">{n.title}</span>
                    {!n.read && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </span>
                  <span className="mt-0.5 block break-words text-caption leading-relaxed text-muted [overflow-wrap:anywhere]">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-muted/70">{timeAgo(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>, document.body,
      )}
    </div>
  );
}
