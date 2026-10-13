import type { RoomVariant } from './furniture';

export const ROOM_SPOTS = {
  lounge: { x: .23, y: .73, label: 'Góc thư giãn' },
  seat: { x: .8, y: .75, label: 'Ghế bên phải' },
  table: { x: .24, y: .82, label: 'Bàn phía trước' },
  plant: { x: .08, y: .73, label: 'Góc cây xanh' },
  lamp: { x: .92, y: .74, label: 'Góc ánh sáng' },
  rug: { x: .5, y: .85, label: 'Thảm giữa phòng' },
  clock: { x: .12, y: .31, label: 'Tường bên trái' },
  portrait: { x: .83, y: .34, label: 'Tường bên phải' },
  heartframe: { x: .23, y: .31, label: 'Khung nhỏ bên trái' },
  shelf: { x: .81, y: .51, label: 'Kệ trên tường' },
  garland: { x: .5, y: .22, label: 'Dây trang trí' },
  cabinet: { x: .22, y: .30, label: 'Tủ treo' },
  counter: { x: .36, y: .75, label: 'Khu vực nấu ăn' },
  fridge: { x: .84, y: .74, label: 'Góc tủ lạnh' },
} as const;
export type RoomSpot = keyof typeof ROOM_SPOTS;
export const WALL_ITEMS = new Set(['clock', 'portrait', 'heartframe', 'shelf', 'garland', 'cabinet']);
export function spotFor(itemId: string, room: RoomVariant): RoomSpot {
  if (itemId === 'sofa') return 'lounge';
  if (itemId === 'chair') return 'seat';
  if (itemId === 'coffeeTable' || itemId === 'bistroTable') return 'table';
  if (itemId in ROOM_SPOTS) return itemId as RoomSpot;
  return room === 'kitchen' ? 'counter' : 'lounge';
}

/** Room-specific arrangements keep seats next to their table and leave a walking lane. */
const ROOM_ANCHORS: Partial<Record<RoomVariant, Partial<Record<RoomSpot, { x: number; y: number; label: string }>>>> = {
  kitchen: {
    seat: { x: .35, y: .85, label: 'Ghế phía trước bàn bếp' },
    clock: { x: .43, y: .32, label: 'Tường cạnh tủ bếp' },
  },
  garden: {
    table: { x: .62, y: .76, label: 'Bàn trong góc ngồi ngoài trời' },
    seat: { x: .73, y: .77, label: 'Ghế cạnh bàn cà phê' },
    plant: { x: .12, y: .73, label: 'Cây cạnh lan can' },
  },
};
export function roomAnchor(room: RoomVariant, spot: RoomSpot) {
  return ROOM_ANCHORS[room]?.[spot] ?? ROOM_SPOTS[spot];
}
