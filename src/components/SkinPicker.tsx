import { useEffect, useState } from 'react';
import { useOutfit } from '../app/skin';
import { vi } from '../content/vi';
import { SLOTS, WARDROBE, JERSEY_COLORWAYS, isUnlocked, totalItems, unlockedItems, type Item, type Slot } from '../lib/wardrobe';
import { Gumi, Jersey } from './Gumi';
import { Icon, type IconName } from './Icon';

const PLACEMENT: Record<Slot, { title: string; hint: string; tag: string }> = {
  hat: { title: 'Phụ kiện đội đầu', hint: 'Một điểm nhấn cho ngày mới', tag: 'ĐỈNH ĐẦU' },
  glasses: { title: 'Phụ kiện khuôn mặt', hint: 'Thêm chút cá tính cho ánh nhìn', tag: 'KHUÔN MẶT' },
  neck: { title: 'Phụ kiện cổ', hint: 'Nơ nhỏ, khăn mềm — vừa xinh dưới cằm', tag: 'VÒNG CỔ' },
  jersey: { title: 'Áo đấu esports', hint: 'Màu áo đặc trưng · Nhìn là nhận ra đội', tag: 'THÂN TRÊN' },
  color: { title: 'Màu lông', hint: 'Chọn sắc màu hợp với bộ đồ', tag: 'TOÀN THÂN' },
  background: { title: 'Không gian sân khấu', hint: 'Thêm chút lấp lánh cho bộ đồ', tag: 'PHÔNG NỀN' },
};

/** Hé lộ danh sách theo TỪNG LÔ khi luồng chính rảnh (requestIdleCallback) → mở tủ đồ KHÔNG treo máy:
 *  mỗi món là 1 Gumi SVG nặng, render hết cùng lúc sẽ khoá main thread vài giây trên máy cũ (A32). */
function useBatchReveal(total: number, resetKey: unknown, step = 3): number {
  const [shown, setShown] = useState(() => Math.min(step, total));
  useEffect(() => { setShown(Math.min(step, total)); }, [resetKey, total, step]);
  useEffect(() => {
    if (shown >= total) return;
    let cancelled = false;
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const grow = () => { if (!cancelled) setShown((s) => Math.min(total, s + step)); };
    const id = w.requestIdleCallback ? w.requestIdleCallback(grow, { timeout: 250 }) : window.setTimeout(grow, 24);
    return () => { cancelled = true; if (w.requestIdleCallback && w.cancelIdleCallback) w.cancelIdleCallback(id); else window.clearTimeout(id); };
  }, [shown, total, step]);
  return shown;
}

/** Tủ đồ PHỐI TỰ DO: chọn mũ / kính / khăn / màu / nền độc lập. Món chưa mở khoá hiện điều kiện. */
export function SkinPicker({ daysDone, onClose }: { daysDone: number; onClose: () => void }) {
  const { outfit, setPiece, reset } = useOutfit();
  const [slot, setSlot] = useState<Slot>('jersey');
  const [note, setNote] = useState<string | null>(null);
  const haveCount = unlockedItems(daysDone);
  const total = totalItems();
  const pct = Math.round((haveCount / Math.max(1, total)) * 100);
  const placement = PLACEMENT[slot];
  const shown = useBatchReveal(WARDROBE[slot].length, slot); // render từng lô cho mượt, không treo

  const tap = (item: Item) => {
    if (!isUnlocked(item, daysDone)) { setNote(vi.wardrobe.locked(item.unlockDays)); return; }
    setNote(null);
    setPiece(slot, item.id);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={vi.wardrobe.title} onClick={onClose}>
      <div className="wardrobe-modal wardrobe-lookbook max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-[26px] border border-border bg-bg shadow-pop" onClick={(e) => e.stopPropagation()}>
        {/* Header gradient + thanh sưu tập */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-[#C24C72] to-[#8E3A78] px-4 pt-4 pb-4 text-on-primary">
          <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/15" />
          <span aria-hidden className="pointer-events-none absolute right-16 top-6 h-12 w-12 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-card bg-white/20 shadow-soft backdrop-blur"><Icon name="shirt" size={22} /></span>
              <div>
                <h2 className="text-title font-extrabold leading-none">{vi.wardrobe.title}</h2>
                <p className="mt-1 text-caption font-semibold opacity-90">{vi.wardrobe.progress(haveCount, total)}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label={vi.wardrobe.close} className="flex h-9 w-9 items-center justify-center rounded-pill bg-white/15 text-on-primary transition-colors hover:bg-white/25"><Icon name="x" size={18} /></button>
          </div>
          <div className="relative mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-pill bg-black/20">
              <div className="h-full rounded-pill bg-gradient-to-r from-accent to-white transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-caption font-bold tabular-nums">{pct}%</span>
          </div>
        </div>

        {/* Sân khấu thử đồ: nền toả sáng + bệ đứng + Gumi (cập nhật ngay khi phối) */}
        <div className="wardrobe-studio relative mx-4 -mt-3 flex flex-col items-center overflow-hidden rounded-[22px] border border-border bg-gradient-to-b from-surface to-bg pb-3 pt-4 shadow-pop">
          <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 78% at 50% -8%, rgba(255,255,255,0.85), rgba(255,255,255,0) 62%)' }} />
          {[['12%', '18%'], ['82%', '22%'], ['24%', '64%'], ['76%', '58%']].map(([l, t], i) => (
            <Icon key={i} name="sparkle" size={i % 2 ? 12 : 16} filled aria-hidden className="pointer-events-none absolute animate-pulse text-accent/70" style={{ left: l, top: t }} />
          ))}
          <div className="relative">
            <Gumi state="bo_pho" size={190} outfit={outfit} />
          </div>
          <span className="wardrobe-placement">{placement.tag}</span>
          <button type="button" onClick={reset} className="absolute right-2 top-2 flex items-center gap-1 rounded-pill border border-border bg-surface/90 px-2.5 py-1 text-caption font-semibold text-muted shadow-soft backdrop-blur transition-transform active:scale-95">
            <Icon name="paw" size={13} />{vi.wardrobe.reset}
          </button>
        </div>

        <div className="mx-4 mt-3 flex items-end justify-between gap-3">
          <div><p className="text-caption font-black tracking-[.12em] text-primary">THỬ ĐỒ TRỰC TIẾP</p><h3 className="text-body font-extrabold">{placement.title}</h3><p className="text-caption font-medium text-muted">{placement.hint}</p></div>
          <span className="hidden rounded-pill bg-primary/10 px-3 py-1 text-caption font-bold text-primary sm:inline">{WARDROBE[slot].length} món</span>
        </div>

        {/* Tabs nhóm món */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
          {SLOTS.map(({ slot: s, label, icon }) => {
            const active = s === slot;
            return (
              <button key={s} type="button" onClick={() => { setSlot(s); setNote(null); }} aria-pressed={active}
                className={`flex shrink-0 items-center gap-1.5 rounded-pill border-2 px-3 py-1.5 text-small font-bold transition-all ${active ? 'border-primary bg-primary text-on-primary shadow-pop' : 'border-border-strong bg-surface text-muted hover:border-primary/50'}`}>
                <Icon name={icon as IconName} size={15} />{label}
              </button>
            );
          })}
        </div>

        {note && <p className="mx-4 mt-2 flex items-center justify-center gap-1.5 rounded-control border border-info/40 bg-info/10 p-2 text-center text-small font-semibold text-info"><Icon name="lock" size={15} /> {note}</p>}

        {/* Lưới món của nhóm đang chọn */}
        <div className="wardrobe-items grid max-h-[32dvh] grid-cols-2 gap-2.5 overflow-auto p-4 pt-3 sm:grid-cols-3 lg:grid-cols-4">
          {WARDROBE[slot].slice(0, shown).map((item) => {
            const unlocked = isUnlocked(item, daysDone);
            const active = outfit[slot] === item.id;
            const isNone = item.id === 'none';
            return (
              <button key={item.id} type="button" onClick={() => tap(item)} aria-pressed={active} disabled={!unlocked}
                className={`group relative flex flex-col items-center gap-1.5 rounded-card border-2 p-2.5 text-center transition-all active:scale-95 ${active ? 'border-primary bg-primary/10 shadow-pop' : 'border-border-strong bg-surface hover:border-primary/40'} ${!unlocked ? 'opacity-80' : ''}`}>
                {active && <span aria-hidden className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary shadow-soft"><Icon name="check" size={12} strokeWidth={3} /></span>}
                <span className={`wardrobe-item-preview ${slot === 'jersey' ? 'jersey-preview' : ''} relative flex h-16 w-full items-center justify-center overflow-hidden rounded-control border border-surface ${isNone ? 'bg-border/40' : ''}`}
                  style={isNone || slot === 'jersey' ? undefined : { background: `linear-gradient(135deg, ${item.swatch}55, ${item.swatch})` }}>
                  {!unlocked ? <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/45"><Icon name="lock" size={18} className="text-white" /></span> : null}
                  {isNone ? <Icon name="x" size={18} className="text-muted" /> : slot === 'jersey' ? <svg viewBox="64 113 78 68" className="jersey-product" aria-hidden="true"><Jersey id={item.id} /></svg> : <Gumi state="bo_pho" size={76} outfit={{ ...outfit, [slot]: item.id }} />}
                </span>
                <span className="line-clamp-1 text-caption font-semibold leading-tight">{item.name}</span>
                {slot === 'jersey' && !isNone && <span className="text-[9px] font-medium leading-tight text-muted">{JERSEY_COLORWAYS[item.id] ?? 'Phối màu đội tuyển'}</span>}
                {active
                  ? <span className="text-caption font-bold text-primary">{vi.wardrobe.using}</span>
                  : !unlocked
                    ? <span className="flex items-center gap-0.5 text-caption leading-tight text-muted"><Icon name="lock" size={10} />{vi.wardrobe.locked(item.unlockDays)}</span>
                    : <span className="text-caption leading-tight text-success">✓ Đã mở</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
