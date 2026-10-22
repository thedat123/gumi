import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../app/session';
import {
  ensureNotificationPermission,
  notificationPermission,
  notificationsSupported,
} from '../lib/notify';
import { pushSupported, subscribePush } from '../lib/push';

interface InAppToast { title: string; body: string; url: string }

/**
 * Bật WEB PUSH cho lời nhắc của Gumi — noti hiện ra khay HĐH kể cả khi app ĐÃ ĐÓNG.
 * Khi app đang focused, SW gửi postMessage `push-inapp` thay vì OS notification →
 * component này nhận và hiện in-app toast ở góc trên (tự tắt sau 5s).
 */
export function ReminderNotifier() {
  const { session } = useSession();
  const nav = useNavigate();
  const [toast, setToast] = useState<InAppToast | null>(null);

  useEffect(() => {
    if (!session || !pushSupported()) return;
    let cancelled = false;

    const sync = async () => { if (!cancelled && notificationPermission() === 'granted') await subscribePush(); };

    const ask = async () => {
      if (!notificationsSupported()) return;
      const perm = await ensureNotificationPermission();
      if (perm === 'granted') await sync();
    };

    void ask();
    if (notificationPermission() === 'default') {
      window.addEventListener('pointerdown', ask, { once: true });
    }

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'push-resubscribe') { void sync(); return; }
      if (e.data?.type === 'push-inapp') {
        setToast({ title: e.data.title ?? 'Mật Độ', body: e.data.body ?? '', url: e.data.url ?? '/' });
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', ask);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [session?.userId]);

  // Auto-dismiss toast after 5 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return createPortal(
    <button
      type="button"
      onClick={() => { setToast(null); nav(toast.url); }}
      className="fixed left-1/2 top-4 z-[9000] flex w-[min(360px,calc(100vw-24px))] -translate-x-1/2 items-start gap-3 rounded-card border border-border bg-surface/95 p-3 text-left shadow-pop backdrop-blur animate-in slide-in-from-top-2 duration-200"
      aria-live="polite"
    >
      <img src="/icons/icon-192.png?v=20261014" alt="" aria-hidden="true" className="mt-0.5 h-9 w-9 shrink-0 rounded-[10px] shadow-soft ring-1 ring-border" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-small font-bold text-text">{toast.title}</span>
        <span className="mt-0.5 block break-words text-caption leading-relaxed text-muted [overflow-wrap:anywhere]">{toast.body}</span>
      </span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setToast(null); }}
        aria-label="Đóng"
        className="shrink-0 text-muted hover:text-text"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </button>,
    document.body,
  );
}
