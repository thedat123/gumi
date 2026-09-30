import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useSession } from '../app/session';
import { dueReminder, type DueReminder } from '../lib/reminders';
import { Icon } from './Icon';

export function InAppReminder() {
  const { session, profile } = useSession();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState<(DueReminder & { day: number }) | null>(null);
  const dismissed = useRef(new Set<string>());
  const playing = pathname.startsWith('/chapter/') || pathname.startsWith('/mission/');

  useEffect(() => {
    if (!session || !profile || playing) { setVisible(null); return; }
    let active = true;
    let request = 0;
    const check = async () => {
      if (document.visibilityState === 'hidden') return;
      const current = ++request;
      try {
        const status = await api.getReminderStatus();
        if (!active || current !== request) return;
        const due = status.phase === 'running'
          ? dueReminder(new Date(), status.lastPlayDate, status.day, status.lastCompletedDate) : null;
        if (!due) { setVisible(null); return; }
        const key = `gumi-reminder:${session.userId}:${due.date}:${due.minute}`;
        let seen = dismissed.current.has(key);
        try { seen ||= localStorage.getItem(key) === '1'; } catch { /* private browsing */ }
        setVisible(seen ? null : { ...due, day: status.day });
      } catch { if (active && current === request) setVisible(null); }
    };
    void check();
    const interval = window.setInterval(() => void check(), 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session?.userId, profile?.id, pathname, playing]);

  const dismiss = () => {
    if (!visible || !session) return;
    const key = `gumi-reminder:${session.userId}:${visible.date}:${visible.minute}`;
    dismissed.current.add(key);
    try { localStorage.setItem(key, '1'); } catch { /* private browsing */ }
    setVisible(null);
  };

  if (!visible || playing) return null;
  return (
    <aside role="status" aria-live="polite" className="safe-bottom fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-card border border-primary/30 bg-surface p-4 text-text shadow-pop sm:bottom-6">
      <div className="flex gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-primary"><Icon name="paw" size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-small font-extrabold text-primary">Gumi nhắc bạn</p>
          <p className="mt-1 text-small leading-relaxed">{visible.text}</p>
          <Link to={`/chapter/${visible.day}`} onClick={dismiss} className="mt-3 inline-flex min-h-10 items-center rounded-control bg-primary px-4 text-small font-bold text-on-primary">Vào chơi ngay</Link>
        </div>
        <button type="button" onClick={dismiss} aria-label="Đóng lời nhắc" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-muted hover:bg-bg"><Icon name="x" size={18} /></button>
      </div>
    </aside>
  );
}
