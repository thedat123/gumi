import { useState, type CSSProperties } from 'react';
import { useRoomDecor } from '../app/room-decor';
import { itemById, type RoomVariant } from '../lib/furniture';
import { roomAnchor, spotFor, WALL_ITEMS } from '../lib/room-layout';
import { FURNITURE_SVG, P } from './FurnitureSvg';
import { Icon } from './Icon';

/** Click-to-furnish layout: furniture rests on fixed floor anchors, wall decor stays on walls. */
export function RoomDecorLayer({ room, act, edit, brightness = 1, lightsOn = true }: {
  room: RoomVariant; act: 1 | 2 | 3; edit: boolean; brightness?: number; lightsOn?: boolean;
}) {
  const { decor, patch, remove } = useRoomDecor();
  const [selected, setSelected] = useState<string | null>(null);
  // Old freely placed items adopt the new physical anchors without destroying saved layouts.
  const occupied = new Map(decor[room].map(p => [p.slot ?? spotFor(p.itemId, room), p]));
  const list = [...occupied.values()];
  const selection = list.find(p => p.uid === selected);
  return <div data-room-floor className={`absolute inset-0 room-fixed-decor room-decor-${room}`} style={{ pointerEvents: 'none' }}>
    {list.map(pl => {
      const item = itemById(pl.itemId);
      const Svg = FURNITURE_SVG[pl.itemId];
      if (!item || !Svg) return null;
      const slot = pl.slot ?? spotFor(pl.itemId, room);
      const anchor = roomAnchor(room, slot);
      const wall = WALL_ITEMS.has(pl.itemId);
      return <button key={pl.uid} type="button" data-spot={slot}
        className={`decor-piece fixed-piece ${edit ? 'fixed-piece-editable' : ''} ${edit && selected === pl.uid ? 'decor-selected' : ''}`}
        disabled={!edit} aria-label={`${item.name} · ${anchor.label}`} aria-pressed={edit ? selected === pl.uid : undefined}
        onClick={() => setSelected(s => s === pl.uid ? null : pl.uid)}
        style={{ '--furniture-base': item.baseW, '--base-width': `${item.baseW}%`, '--anchor-x': `${anchor.x * 100}%`, '--anchor-y': `${anchor.y * 100}%`,
          transform: `translate(-50%, ${wall ? '-50%' : '-94%'})`,
          zIndex: pl.itemId === 'rug' ? 1 : wall ? 5 : Math.round(anchor.y * 100),
          pointerEvents: edit ? 'auto' : 'none', filter: `brightness(${brightness}) saturate(${lightsOn ? 1 : .88})` } as CSSProperties}>
        <span className="fixed-piece-art" style={{ transform: `scaleX(${pl.flip ? -1 : 1})` }}><Svg p={P[act]} /></span>
      </button>;
    })}
    {edit && selection && <div className="fixed-decor-tools" style={{ pointerEvents: 'auto' }}>
      <div><strong>{itemById(selection.itemId)?.name}</strong><span>{roomAnchor(room, selection.slot ?? spotFor(selection.itemId, room)).label}</span></div>
      <button type="button" aria-label="Đổi hướng" onClick={() => patch(room, selection.uid, { flip: !selection.flip })}><Icon name="flip" size={18} /></button>
      <button type="button" aria-label="Cất vào tủ" onClick={() => { remove(room, selection.uid); setSelected(null); }}><Icon name="trash" size={18} /></button>
      <button type="button" aria-label="Bỏ chọn" onClick={() => setSelected(null)}><Icon name="x" size={18} /></button>
    </div>}
  </div>;
}
