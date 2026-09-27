import { useState } from 'react';
import { useOutfit } from '../app/skin';
import { vi } from '../content/vi';
import { SLOTS, WARDROBE, isUnlocked, totalItems, unlockedItems, type Item, type Slot } from '../lib/wardrobe';
import { Gumi } from './Gumi';
import { Icon, type IconName } from './Icon';

/** Tủ đồ PHỐI TỰ DO: chọn mũ / kính / khăn / màu / nền độc lập. Món chưa mở khoá hiện điều kiện. */
export function SkinPicker({ daysDone, onClose }: { daysDone: number; onClose: () => void }) {
  const { outfit, setPiece, reset } = useOutfit();
  const [slot, setSlot] = useState<Slot>('hat');
  const [note, setNote] = useState<string | null>(null);
  const haveCount = unlockedItems(daysDone);
  const total = totalItems();
  const pct = Math.round((haveCount / Math.max(1, total)) * 100);

  const tap = (item: Item) => {
    if (!isUnlocked(item, daysDone)) { setNote(vi.wardrobe.locked(item.unlockDays)); return; }
    setNote(null);
    setPiece(slot, item.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={vi.wardrobe.title} onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-hidden rounded-card border border-border bg-bg shadow-pop" onClick={(e) => e.stopPropagation()}>
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
        <div className="relative mx-4 -mt-3 flex flex-col items-center overflow-hidden rounded-card border border-border bg-gradient-to-b from-surface to-bg pb-3 pt-4 shadow-pop">
          <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 78% at 50% -8%, rgba(255,255,255,0.85), rgba(255,255,255,0) 62%)' }} />
          {[['12%', '18%'], ['82%', '22%'], ['24%', '64%'], ['76%', '58%']].map(([l, t], i) => (
            <Icon key={i} name="sparkle" size={i % 2 ? 12 : 16} filled aria-hidden className="pointer-events-none absolute animate-pulse text-accent/70" style={{ left: l, top: t }} />
          ))}
          <div className="relative">
            <Gumi state="bo_pho" size={138} outfit={outfit} />
            <span aria-hidden className="pointer-events-none absolute -bottom-1 left-1/2 h-3 w-24 -translate-x-1/2 rounded-[100%] bg-black/15 blur-[3px]" />
          </div>
          <button type="button" onClick={reset} className="absolute right-2 top-2 flex items-center gap-1 rounded-pill border border-border bg-surface/90 px-2.5 py-1 text-caption font-semibold text-muted shadow-soft backdrop-blur transition-transform active:scale-95">
            <Icon name="paw" size={13} />{vi.wardrobe.reset}
          </button>
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
        <div className="grid max-h-[34dvh] grid-cols-3 gap-2.5 overflow-auto p-4 pt-3">
          {WARDROBE[slot].map((item) => {
            const unlocked = isUnlocked(item, daysDone);
            const active = outfit[slot] === item.id;
            const isNone = item.id === 'none';
            return (
              <button key={item.id} type="button" onClick={() => tap(item)} aria-pressed={active} disabled={!unlocked}
                className={`group relative flex flex-col items-center gap-1.5 rounded-card border-2 p-2.5 text-center transition-all active:scale-95 ${active ? 'border-primary bg-primary/10 shadow-pop' : 'border-border-strong bg-surface hover:border-primary/40'} ${!unlocked ? 'opacity-80' : ''}`}>
                {active && <span aria-hidden className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary shadow-soft"><Icon name="check" size={12} strokeWidth={3} /></span>}
                <span className={`relative flex h-12 w-12 items-center justify-center rounded-pill border-2 border-surface shadow-soft ${isNone ? 'bg-border/40' : ''}`}
                  style={isNone ? undefined : { background: item.swatch }}>
                  {!unlocked ? <span className="flex h-full w-full items-center justify-center rounded-pill bg-black/35"><Icon name="lock" size={16} className="text-white" /></span>
                    : isNone ? <Icon name="x" size={16} className="text-muted" />
                    : null}
                </span>
                <span className="line-clamp-1 text-caption font-semibold leading-tight">{item.name}</span>
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
