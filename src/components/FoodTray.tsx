import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { vi } from '../content/vi';
import { FoodArt } from './FoodArt';
import { Icon } from './Icon';
import './food-tray.css';

type Food = (typeof vi.foodTray.foods)[number];
type Gesture = { food: Food; pointer: number; x: number; y: number; moved: boolean };

/** Tap, keyboard, mouse and touch share the same feeding action. */
export function FoodTray({ onFeed }: { onFeed: (food: string) => void }) {
  const [drag, setDrag] = useState<{ food: Food; x: number; y: number } | null>(null);
  const [served, setServed] = useState<Food | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const target = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTarget = () => { target.current?.classList.remove('food-drop-ready'); target.current = null; };
  useEffect(() => () => { clearTimeout(timer.current); clearTarget(); }, []);

  const serve = (food: Food) => {
    onFeed(food.emoji);
    setServed(food);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setServed(null), 2200);
  };
  const findTarget = (x: number, y: number) => Array.from(document.querySelectorAll<HTMLElement>('[data-feed-target]')).find(el => {
    const rect = el.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }) ?? null;
  const start = (food: Food, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    suppressClick.current = false;
    gesture.current = { food, pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointer) return;
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 6) current.moved = true;
    if (!current.moved) return;
    setDrag({ food: current.food, x: event.clientX, y: event.clientY });
    const next = findTarget(event.clientX, event.clientY);
    if (next !== target.current) { clearTarget(); target.current = next; next?.classList.add('food-drop-ready'); }
  };
  const finish = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointer) return;
    gesture.current = null;
    suppressClick.current = current.moved || cancelled;
    clearTarget();
    setDrag(null);
    if (!cancelled && current.moved && findTarget(event.clientX, event.clientY)) serve(current.food);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <>
    <section className={`food-bar ${drag ? 'is-dragging' : ''}`} aria-label={vi.foodTray.title}>
      <div className="food-bar-heading">
        <span className="food-bar-title"><Icon name="utensils" size={12} />{vi.foodTray.title}</span>
        <span className="food-bar-flourish" aria-hidden="true">✦</span>
      </div>
      <div className="food-bar-menu">
        {vi.foodTray.foods.map(food => <button key={food.kind} type="button" className="food-bar-item"
          data-active={served?.kind === food.kind} data-dragging={drag?.food.kind === food.kind}
          style={{ '--food-tint': food.tint, '--food-accent': food.accent } as CSSProperties}
          aria-label={vi.foodTray.feed(food.name)} onContextMenu={event => event.preventDefault()}
          onPointerDown={event => start(food, event)} onPointerMove={move}
          onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}
          onLostPointerCapture={event => { if (gesture.current) finish(event, true); }}
          onClick={event => { if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; } serve(food); }}>
          <span className="food-bar-plate"><FoodArt kind={food.kind} /><span className="food-bar-check" aria-hidden="true"><Icon name="check" size={9} strokeWidth={3} /></span></span>
          <span className="food-bar-name">{food.name}</span>
        </button>)}
      </div>
      <p className="food-bar-hint" role="status">{drag ? vi.foodTray.dragging : served ? vi.foodTray.served(served.name) : vi.foodTray.hint}</p>
    </section>
    {drag && createPortal(<div className="food-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><FoodArt kind={drag.food.kind} /></div>, document.body)}
  </>;
}
