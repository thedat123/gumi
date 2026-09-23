import { useState, type PointerEvent as ReactPointerEvent } from 'react';

const FOODS = ['🍎', '🍣', '🥛', '🍪', '🥕', '🐟'];

/** Khay thức ăn — KÉO một món thả vào Gumi để cho ăn (chạy cả chuột lẫn cảm ứng). */
export function FoodTray({ onFeed }: { onFeed: (food: string) => void }) {
  const [drag, setDrag] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const start = (food: string) => (e: ReactPointerEvent) => {
    e.preventDefault();
    setDrag(food);
    setPos({ x: e.clientX, y: e.clientY });
    const move = (ev: PointerEvent) => setPos({ x: ev.clientX, y: ev.clientY });
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      if (el && el.closest('[data-feed-target]')) onFeed(food);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <>
      <div className="mx-auto flex items-center gap-2 rounded-pill border-2 border-surface bg-surface/90 px-3 py-1.5 shadow-soft backdrop-blur">
        <span className="shrink-0 text-caption font-bold text-muted">🍽️ Kéo cho ăn</span>
        {FOODS.map((f) => (
          <button key={f} type="button" onPointerDown={start(f)} aria-label={`Kéo ${f} cho Gumi ăn`}
            className="flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-pill bg-bg text-title shadow-soft transition-transform active:scale-90">
            {f}
          </button>
        ))}
      </div>
      {drag && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 text-5xl drop-shadow-[0_4px_6px_rgba(58,36,30,0.35)]" style={{ left: pos.x, top: pos.y }} aria-hidden="true">{drag}</div>
      )}
    </>
  );
}
