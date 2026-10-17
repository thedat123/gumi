import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { vi } from '../content/vi';
import { Banner } from './Banner';
import { Button } from './Button';
import { Icon } from './Icon';

/**
 * Hộp Bùa Hồi Sinh — phong cách "premium" đồng bộ app: hero gradient brand + huy hiệu tim,
 * chip số Bùa còn lại, phần giải thích & trạng thái (cứu được / để dành) rõ ràng.
 * `canUse` = đang hấp hối và còn Bùa → cho bấm dùng; ngược lại chỉ thông tin.
 * Đóng bằng Esc, tự đưa focus vào nút đầu tiên. `error`: lần dùng trước lỗi.
 */
export function SugarPassDialog({ hoursLeft, passesLeft, canUse = true, onConfirm, onCancel, error = false }: {
  hoursLeft: number | null; passesLeft?: number; canUse?: boolean; onConfirm: () => void; onCancel: () => void; error?: boolean;
}) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-[#1C1029]/70 p-4 backdrop-blur-md sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="pass-title"
        className="safe-bottom relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/70 bg-surface shadow-[0_28px_90px_rgba(20,7,30,.42)]">

        {/* Hero gradient brand — huy hiệu tim + tiêu đề + chip số Bùa */}
        <div className="grad-brand relative overflow-hidden px-6 pb-5 pt-6 text-center text-on-primary">
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-black/10 blur-2xl" />
          <div aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/18 ring-1 ring-white/30 shadow-[0_8px_24px_rgba(0,0,0,.18)]">
            <Icon name="heart" size={30} filled />
          </div>
          <h2 id="pass-title" className="mt-3 text-title font-extrabold tracking-tight">{vi.pass.title}</h2>
          {passesLeft !== undefined && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-pill bg-white/18 px-3 py-1 text-small font-bold ring-1 ring-white/25">
              <Icon name="heart" size={14} filled /> {vi.pass.count(passesLeft)}
            </span>
          )}
        </div>

        {/* Thân — giải thích + trạng thái */}
        <div className="p-5 pt-4">
          <p className="text-small leading-relaxed text-muted">{vi.pass.body}</p>

          {canUse && hoursLeft !== null && (
            <div className="mt-3 flex items-center gap-2 rounded-control border border-danger/25 bg-danger/8 px-3 py-2 text-small font-semibold text-danger">
              <Icon name="clock" size={16} /> Còn {hoursLeft} giờ để cứu chuỗi
            </div>
          )}
          {!canUse && (
            <div className="mt-3 flex items-start gap-2 rounded-control border border-info/30 bg-info/8 px-3 py-2 text-caption leading-relaxed text-info">
              <Icon name="lock" size={14} className="mt-0.5 shrink-0" /> {vi.pass.locked}
            </div>
          )}
          {error && <div className="mt-3"><Banner kind="error">{vi.errors.server}</Banner></div>}

          <div className="mt-5 flex gap-3">
            {canUse ? (
              <>
                <Button ref={first} onClick={onConfirm} block>{error ? vi.errors.retry : vi.pass.confirm}</Button>
                <Button variant="secondary" onClick={onCancel} block>{vi.pass.cancel}</Button>
              </>
            ) : (
              <Button ref={first} variant="secondary" onClick={onCancel} block>{vi.pass.gotIt}</Button>
            )}
          </div>
        </div>
      </div>
    </div>, document.body,
  );
}
