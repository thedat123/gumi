import { useEffect, useRef } from 'react';
import { vi } from '../content/vi';
import { Button } from './Button';

/** Hộp xác nhận dùng Sugar Pass. Đóng bằng phím Esc, tự đưa focus vào nút đầu tiên. */
export function SugarPassDialog({ hoursLeft, onConfirm, onCancel }: { hoursLeft: number | null; onConfirm: () => void; onCancel: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-text/50 p-4 sm:items-center" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="pass-title" className="safe-bottom w-full max-w-sm rounded-card bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <h2 id="pass-title" className="text-title font-bold">{vi.pass.title}</h2>
        <p className="mt-2 text-small text-muted">{vi.pass.body}</p>
        {hoursLeft !== null && <p className="mt-2 text-small font-semibold text-danger">⏳ Còn {hoursLeft} giờ</p>}
        <div className="mt-4 flex gap-3">
          <Button ref={first} onClick={onConfirm} block>{vi.pass.confirm}</Button>
          <Button variant="secondary" onClick={onCancel} block>{vi.pass.cancel}</Button>
        </div>
      </div>
    </div>
  );
}
