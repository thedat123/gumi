import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';

/** Portal keeps the dismiss layer outside the transformed game HUD. */
export function RoomWeatherMenu({ anchor, options, selected, onSelect, onClose }: {
  anchor: RefObject<HTMLButtonElement | null>;
  options: readonly { label: string; icon: IconName }[];
  selected: number; onSelect: (index: number) => void; onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  useLayoutEffect(() => {
    const trigger = anchor.current;
    const update = () => {
      const a = trigger?.getBoundingClientRect();
      const r = menu.current?.getBoundingClientRect();
      if (!a || !r) return;
      setPosition({ left: Math.max(12, Math.min(a.x + a.width / 2 - r.width / 2, innerWidth - r.width - 12)), top: Math.max(12, Math.min(a.bottom + 10, innerHeight - r.height - 12)) });
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const step = event.key === 'ArrowDown' ? 4 : event.key === 'ArrowUp' ? -4 : event.key === 'ArrowLeft' ? -1 : 1;
        buttons[(index + step + buttons.length) % buttons.length]?.focus();
      }
    };
    update();
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('keydown', keydown);
      trigger?.focus();
    };
  }, [anchor, onClose]);
  return createPortal(<div className="room-weather-overlay" onClick={onClose}>
    <div ref={menu} id="room-weather-menu" className="room-weather-menu" style={position} onClick={event => event.stopPropagation()}>
      <div className="room-weather-heading"><span>THỜI TIẾT</span><button type="button" aria-label="Đóng thời tiết" onClick={onClose}><Icon name="x" size={16} /></button></div>
      <div role="menu" aria-label="Chọn thời tiết" className="room-weather-grid">
        {options.map((option, index) => <button key={option.label} type="button" role="menuitemradio" aria-checked={selected === index} onClick={() => onSelect(index)}>
          <Icon name={option.icon} size={22} /><span>{option.label}</span>
        </button>)}
      </div>
    </div>
  </div>, document.body);
}
