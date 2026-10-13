import { useRoomDecor } from '../app/room-decor';
import { isUnlocked, itemsForRoom, totalItems, unlockedCount, type RoomVariant } from '../lib/furniture';
import { FURNITURE_SVG, P } from './FurnitureSvg';
import { Icon } from './Icon';
import { roomAnchor, spotFor } from '../lib/room-layout';
import { vi } from '../content/vi';

const ROOM_NAME: Record<RoomVariant, string> = { living: 'Phòng khách', kitchen: 'Nhà bếp', garden: 'Ban công' };


/** A horizontal furnishing dock: one tap places or stores a piece at its physical anchor. */
export function FurnitureDrawer({ room, act, daysDone, onClose }:
  { room: RoomVariant; act: 1 | 2 | 3; daysDone: number; onClose: () => void }) {
  const { decor, furnish, remove, clear, applyDefault } = useRoomDecor();
  const items = itemsForRoom(room);
  const have = unlockedCount(daysDone);
  const total = totalItems();
  const pct = Math.round((have / Math.max(1, total)) * 100);
  const p = P[act];

  return (
    <div className="furniture-overlay pointer-events-none fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="false" aria-label={vi.furniture.title}>

      <div className="furniture-drawer wardrobe-modal pointer-events-auto max-h-[56dvh] w-full overflow-hidden rounded-t-[26px] border-x border-t border-border bg-bg shadow-pop">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-[#C24C72] to-[#8E3A78] px-4 pb-3 pt-3 text-on-primary">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-card bg-white/20 shadow-soft"><Icon name="sofa" size={20} /></span>
              <div>
                <h2 className="text-body font-extrabold leading-none">{vi.furniture.title}</h2>
                <p className="mt-0.5 text-caption font-semibold opacity-90">{ROOM_NAME[room]} · {vi.furniture.unlocked(have, total)} ({pct}%)</p>
              </div>
            </div>
            <button onClick={onClose} aria-label={vi.wardrobe.close} className="flex h-9 w-9 items-center justify-center rounded-pill bg-white/15 transition-colors hover:bg-white/25"><Icon name="x" size={18} /></button>
          </div>
          <p className="mt-2 text-caption font-medium opacity-90">Chọn món bạn thích. Gumi sẽ đặt đúng chỗ, vừa vặn với căn phòng.</p>
        </div>

        {/* Thao tác nhanh */}
        <div className="flex gap-2 px-4 pt-3">
          <button type="button" onClick={() => { applyDefault(room, daysDone); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-control border-2 border-primary/50 bg-primary/10 px-3 py-2 text-small font-bold text-primary transition-transform active:scale-95">
            <Icon name="sparkle" size={15} />{vi.furniture.sample}
          </button>
          <button type="button" onClick={() => { clear(room); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-control border-2 border-border-strong bg-surface px-3 py-2 text-small font-bold text-muted transition-transform active:scale-95">
            <Icon name="trash" size={15} />{vi.furniture.clear}
          </button>
        </div>



        {/* Lưới món */}
        <div className="furniture-items grid max-h-[32dvh] grid-cols-3 gap-2.5 overflow-auto p-4 pt-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => {
            const unlocked = isUnlocked(item, daysDone);
            const Svg = FURNITURE_SVG[item.id];
            const placed = decor[room].find(p => p.itemId === item.id);
            const spot = roomAnchor(room, spotFor(item.id, room));
            return (
              <button
                key={item.id}
                type="button"
                disabled={!unlocked}
                aria-pressed={Boolean(placed)}
                onClick={() => { if (placed) remove(room, placed.uid); else furnish(room, item.id); }}
                aria-label={`${vi.furniture.add} ${item.name}`}
                className={`group relative flex flex-col items-center gap-1 rounded-card border-2 p-2 text-center transition-all active:scale-95 ${placed ? 'border-primary bg-primary/10' : unlocked ? 'border-border-strong bg-surface hover:border-primary/50' : 'opacity-80'}`}
              >
                <span className="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-control border border-surface bg-gradient-to-br from-[#fff4ec] via-[#f3e2ef] to-[#e5efea]">
                  {!unlocked && <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/45"><Icon name="lock" size={16} className="text-white" /></span>}
                  <span className="flex w-[78%] items-center justify-center">{Svg ? <Svg p={p} /> : null}</span>
                </span>
                <span className="line-clamp-1 text-caption font-semibold leading-tight">{item.name}</span>
                {unlocked && <span className="text-[9px] font-bold text-primary">{placed ? '✓ Đang bày · Chạm để cất' : spot.label}</span>}
                {!unlocked && <span className="flex items-center gap-0.5 text-[10px] leading-tight text-muted"><Icon name="lock" size={9} />{vi.wardrobe.locked(item.unlockDays)}</span>}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
