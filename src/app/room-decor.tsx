import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_LAYOUT, EMPTY_DECOR, itemById, newUid,
  type DecorState, type Placement, type RoomVariant,
} from '../lib/furniture';

import { roomAnchor, spotFor } from '../lib/room-layout';

// Nội thất người chơi đã bày trong từng phòng — lưu localStorage (prototype, mẫu như app/skin.tsx).
const KEY = 'ld_room_decor';

interface DecorCtx {
  decor: DecorState;
  place: (room: RoomVariant, itemId: string, x?: number, y?: number) => void;
  furnish: (room: RoomVariant, itemId: string) => void;
  move: (room: RoomVariant, uid: string, x: number, y: number) => void;
  patch: (room: RoomVariant, uid: string, change: Partial<Pick<Placement, 'scale' | 'flip' | 'rotation'>>) => void;
  remove: (room: RoomVariant, uid: string) => void;
  clear: (room: RoomVariant) => void;
  applyDefault: (room: RoomVariant, daysDone?: number) => void;
}

const Ctx = createContext<DecorCtx>({
  decor: EMPTY_DECOR(), furnish: () => {}, place: () => {}, move: () => {}, patch: () => {}, remove: () => {}, clear: () => {}, applyDefault: () => {},
});

function load(): DecorState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY_DECOR(), ...(JSON.parse(raw) as Partial<DecorState>) };
  } catch { /* private mode */ }
  return EMPTY_DECOR();
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function RoomDecorProvider({ children }: { children: ReactNode }) {
  const [decor, setDecor] = useState<DecorState>(load);

  const update = useCallback((room: RoomVariant, fn: (list: Placement[]) => Placement[]) => {
    setDecor((cur) => {
      const next = { ...cur, [room]: fn(cur[room]) };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* bỏ qua */ }
      return next;
    });
  }, []);

  const value = useMemo<DecorCtx>(() => ({
    decor,
    place: (room, itemId, x = 0.5, y = 0.55) => {
      if (!itemById(itemId)) return;
      update(room, (list) => [...list, { uid: newUid(), itemId, x: clamp01(x), y: clamp01(y), scale: 1 }]);
    },
    furnish: (room, itemId) => {
      if (!itemById(itemId)) return;
      const slot = spotFor(itemId, room);
      const { x, y } = roomAnchor(room, slot);
      update(room, (list) => [...list.filter((p) => (p.slot ?? spotFor(p.itemId, room)) !== slot && p.itemId !== itemId), { uid: newUid(), itemId, slot, x, y, scale: 1 }]);
    },
    move: (room, uid, x, y) => update(room, (list) => list.map((p) => (p.uid === uid ? { ...p, x: clamp01(x), y: clamp01(y) } : p))),
    patch: (room, uid, change) => update(room, (list) => list.map((p) => (p.uid === uid ? { ...p, ...change } : p))),
    remove: (room, uid) => update(room, (list) => list.filter((p) => p.uid !== uid)),
    clear: (room) => update(room, () => []),
    applyDefault: (room, daysDone = Infinity) => update(room, () => DEFAULT_LAYOUT[room]().filter(p => (itemById(p.itemId)?.unlockDays ?? Infinity) <= daysDone).map((p) => { const slot = spotFor(p.itemId, room); const { x, y } = roomAnchor(room, slot); return { ...p, slot, x, y, rotation: 0 }; }).filter((p, i, list) => list.findIndex((q) => q.slot === p.slot) === i)),
  }), [decor, update]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useRoomDecor = () => useContext(Ctx);
