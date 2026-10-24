import { useEffect, useRef, useState } from 'react';
import { errorCode } from '../lib/errors';
import { createPortal } from 'react-dom';
import { vi } from '../content/vi';
import { Button } from './Button';
import { Icon } from './Icon';

/**
 * Hộp Bùa Hồi Sinh — phong cách "premium" đồng bộ app: hero gradient brand + huy hiệu tim,
 * chip số Bùa còn lại, phần giải thích & trạng thái (cứu được / để dành) rõ ràng.
 * Nút "Dùng Bùa" LUÔN phản hồi rõ ràng:
 *   - `canUse` (lỡ đúng 1 ngày + còn Bùa) → gọi `onConfirm` (dùng thật; lỗi server hiện ngay trong hộp).
 *   - chưa lỡ ngày nào → báo "chưa cần dùng", Bùa giữ nguyên; hết Bùa → báo hết.
 * Đóng bằng Esc, tự đưa focus vào nút đầu tiên.
 */
export function SugarPassDialog({ hoursLeft, passesLeft, canUse = false, onConfirm, onCancel }: {
  hoursLeft: number | null; passesLeft?: number; canUse?: boolean; onConfirm: () => Promise<void>; onCancel: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const noneLeft = passesLeft === 0;
  const use = async () => {
    if (busy) return;
    if (noneLeft) { setNote({ kind: 'info', text: vi.pass.noneLeft }); return; }
    if (!canUse) { setNote({ kind: 'info', text: vi.pass.noMiss }); return; }
    setBusy(true); setNote(null);
    try { await onConfirm(); }
    catch (e) {
      const c = errorCode(e);
      setNote(c === 'not_today' ? { kind: 'info', text: vi.pass.noMiss } : c === 'no_pass' ? { kind: 'info', text: vi.pass.noneLeft } : { kind: 'error', text: vi.errors.server });
    } finally { setBusy(false); }
  };
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
        className="safe-bottom relative w-full max-w-[26rem] overflow-hidden rounded-[28px] border border-white/70 bg-surface shadow-[0_28px_90px_rgba(20,7,30,.42)]">

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
          {!canUse && !note && (
            <div className="mt-3 flex items-start gap-2 rounded-control border border-info/30 bg-info/8 px-3 py-2 text-caption leading-relaxed text-info">
              <Icon name="lock" size={14} className="mt-0.5 shrink-0" /> {noneLeft ? vi.pass.noneLeft : vi.pass.locked}
            </div>
          )}
          {note && (
            <div role="status" aria-live="polite" className={`mt-3 flex items-start gap-2 rounded-control border px-3 py-2 text-small font-semibold leading-relaxed ${note.kind === 'error' ? 'border-danger/30 bg-danger/8 text-danger' : 'border-info/30 bg-info/8 text-info'}`}>
              <Icon name={note.kind === 'error' ? 'x' : 'lock'} size={15} className="mt-0.5 shrink-0" /> {note.text}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <Button ref={first} onClick={use} loading={busy} disabled={busy} block className="whitespace-nowrap">{busy ? vi.pass.using : note?.kind === 'error' ? vi.errors.retry : vi.pass.confirm}</Button>
            <Button variant="secondary" onClick={onCancel} block className="whitespace-nowrap">{note?.kind === 'info' ? vi.pass.gotIt : vi.pass.cancel}</Button>
          </div>
        </div>
      </div>
    </div>, document.body,
  );
}
