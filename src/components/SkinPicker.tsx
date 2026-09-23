import { useState } from 'react';
import { useSkin } from '../app/skin';
import { vi } from '../content/vi';
import { SKINS, type Skin } from '../lib/skins';
import { Gumi } from './Gumi';
import { Icon } from './Icon';

/** Tủ đồ: xem trước skin, chọn skin đã mở khoá; skin bị khoá hiện điều kiện mở. */
export function SkinPicker({ daysDone, onClose }: { daysDone: number; onClose: () => void }) {
  const { skinId, setSkinId } = useSkin();
  const [note, setNote] = useState<string | null>(null);
  const haveCount = SKINS.filter((s) => daysDone >= s.unlockDays).length;

  const tap = (s: Skin) => {
    if (daysDone < s.unlockDays) { setNote(vi.wardrobe.locked(s.unlockDays)); return; }
    setNote(null);
    setSkinId(s.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3" role="dialog" aria-modal="true" aria-label={vi.wardrobe.title} onClick={onClose}>
      <div className="max-h-[88dvh] w-full max-w-md overflow-auto rounded-card border border-border bg-bg p-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-title font-bold">{vi.wardrobe.title}</h2>
            <p className="text-caption text-muted">{vi.wardrobe.progress(haveCount, SKINS.length)}</p>
          </div>
          <button onClick={onClose} aria-label={vi.wardrobe.close} className="flex h-10 w-10 items-center justify-center rounded-pill text-muted transition-colors hover:bg-border/60"><Icon name="x" size={20} /></button>
        </div>

        <p className="mt-1 text-small text-muted">{vi.wardrobe.subtitle}</p>

        <div className="my-3 flex flex-col items-center gap-1">
          <Gumi state="bo_pho" size={128} skinId={skinId} />
        </div>

        {note && <p className="mb-2 flex items-center justify-center gap-1.5 rounded-control border border-info/40 bg-info/10 p-2 text-center text-small font-semibold text-info"><Icon name="lock" size={15} /> {note}</p>}

        <div className="grid grid-cols-3 gap-2">
          {SKINS.map((s) => {
            const unlocked = daysDone >= s.unlockDays;
            const active = s.id === skinId;
            return (
              <button key={s.id} type="button" onClick={() => tap(s)} aria-pressed={active} disabled={!unlocked}
                className={`relative flex flex-col items-center gap-1 rounded-card border-2 p-2 text-center transition-transform active:scale-95 ${active ? 'border-primary bg-primary/10' : 'border-border-strong bg-surface'} ${!unlocked ? 'opacity-70' : ''}`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-pill border-2 border-surface text-on-primary shadow-soft" style={{ background: s.swatch }}>
                  {unlocked ? (active ? <Icon name="check" size={18} /> : null) : <Icon name="lock" size={16} className="text-white/90" />}
                </span>
                <span className="text-caption font-semibold leading-tight">{s.name}</span>
                {active
                  ? <span className="text-caption font-bold text-primary">{vi.wardrobe.using}</span>
                  : !unlocked && <span className="text-caption leading-tight text-muted">{vi.wardrobe.locked(s.unlockDays)}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
