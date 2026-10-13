// Nội thất phòng Gumi — TÁCH RIÊNG TỪNG MÓN, cất trong "Tủ nội thất" (giống tủ quần áo).
// Phòng ban đầu TRỐNG: người chơi kéo từng món ra & tự sắp xếp. Mở khoá dần theo số ngày đã xong.
//
// Mô hình toạ độ KHÔNG phụ thuộc renderer (dùng chung cho cả phòng 2D lẫn 3D):
//   x,y ∈ [0..1] = vị trí TÂM của món trong khung phòng; scale = hệ số so với kích thước gốc.
// → 2D map sang CSS %, 3D (Phase 2) map sang toạ độ thế giới trên mặt sàn. Cùng một state.

export type RoomVariant = 'living' | 'kitchen' | 'garden';
export const ROOM_VARIANTS: RoomVariant[] = ['living', 'kitchen', 'garden'];

export interface Placement {
  uid: string;        // định danh duy nhất của món ĐÃ đặt (một loại có thể đặt nhiều lần)
  itemId: string;     // khớp khoá trong FURNITURE_SVG + id trong FURNITURE
  x: number;          // 0..1 — tâm theo chiều ngang khung phòng
  y: number;          // 0..1 — tâm theo chiều dọc khung phòng
  scale: number;      // hệ số kích thước (1 = gốc)
  slot?: import('./room-layout').RoomSpot;
  rotation?: number; // degrees around the floor normal; shared by both renderers
  flip?: boolean;     // lật ngang
}

export type DecorState = Record<RoomVariant, Placement[]>;
export const EMPTY_DECOR = (): DecorState => ({ living: [], kitchen: [], garden: [] });

export interface FurnitureItem {
  id: string;
  name: string;
  rooms: RoomVariant[]; // phòng được phép đặt món này
  unlockDays: number;   // số ngày hoàn thành để mở khoá (0 = có sẵn)
  baseW: number;        // bề rộng mặc định theo % bề rộng phòng
  swatch: string;       // màu đại diện ở ô chọn trong tủ
}

const F = (id: string, name: string, rooms: RoomVariant[], unlockDays: number, baseW: number, swatch: string): FurnitureItem =>
  ({ id, name, rooms, unlockDays, baseW, swatch });

/** Danh mục nội thất — mỗi dòng là MỘT món đặt độc lập (kể cả từng ô tủ bếp).
 *  (Cửa sổ & lan can KHÔNG ở đây: giờ là KIẾN TRÚC dựng sẵn trong nền phòng.) */
export const FURNITURE: FurnitureItem[] = [
  // Nội thất cơ bản để mọi người có thể bắt đầu xây phòng ngay.
  F('sofa', 'Sofa mây hồng', ['living'], 0, 38, '#DDA6BE'),
  F('chair', 'Ghế gỗ nhỏ', ['living', 'kitchen', 'garden'], 0, 18, '#D3AD8D'),
  F('coffeeTable', 'Bàn trà', ['living', 'garden'], 0, 28, '#E1B799'),
  // Phòng khách
  F('shelf', 'Kệ trưng bày', ['living'], 2, 30, '#C98545'),
  F('lamp', 'Đèn bàn', ['living'], 3, 22, '#FFD98A'),
  F('clock', 'Đồng hồ treo', ['living', 'kitchen'], 4, 9, '#FFF6EC'),
  F('portrait', 'Tranh Mèo đeo ngọc trai', ['living'], 5, 22, '#E7A86A'),
  F('heartframe', 'Tranh Gumayusi chiến thắng', ['living'], 6, 16, '#EDA9BB'),
  // Dùng chung nhiều phòng
  F('plant', 'Chậu cây', ['living', 'kitchen', 'garden'], 0, 13, '#5CB56B'),
  F('rug', 'Thảm tròn', ['living', 'garden'], 1, 70, '#F2C7D2'),
  F('garland', 'Dây cờ', ['living', 'kitchen', 'garden'], 0, 92, '#FFD7E6'),
  // Nhà bếp
  F('cabinet', 'Tủ bếp', ['kitchen'], 0, 24, '#F5E0C6'),
  F('counter', 'Bàn bếp', ['kitchen'], 1, 70, '#CE9E6E'),
  F('fridge', 'Tủ lạnh', ['kitchen'], 2, 15, '#EDEFF2'),
  // Ban công
  F('bistroTable', 'Bàn cà phê', ['garden'], 1, 26, '#EAD9C2'),
];

export const itemById = (id: string): FurnitureItem | undefined => FURNITURE.find((i) => i.id === id);
export const itemsForRoom = (room: RoomVariant): FurnitureItem[] => FURNITURE.filter((i) => i.rooms.includes(room));
export const isUnlocked = (item: FurnitureItem, daysDone: number): boolean => daysDone >= item.unlockDays;
export const totalItems = (): number => FURNITURE.length;
export const unlockedCount = (daysDone: number): number => FURNITURE.filter((i) => daysDone >= i.unlockDays).length;

let seq = 0;
/** Sinh uid cho món vừa đặt (ổn định trong 1 phiên; đủ dùng cho localStorage prototype). */
export const newUid = (): string => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

const at = (itemId: string, x: number, y: number, scale = 1, flip = false): Placement =>
  ({ uid: newUid(), itemId, x, y, scale, flip });

/** Bố cục MẪU đẹp (số hoá lại layout cứng cũ) — dùng cho nút "Sắp xếp mẫu", không tự áp khi mới đăng ký. */
export const DEFAULT_LAYOUT: Record<RoomVariant, () => Placement[]> = {
  living: () => [
    at('sofa', 0.3, 0.67, 1),
    at('coffeeTable', 0.3, 0.83, 0.8),
    at('chair', 0.82, 0.81, 1),
    at('garland', 0.5, 0.05, 1),
    at('clock', 0.15, 0.23, 0.8),
    at('portrait', 0.85, 0.23, 0.6),
    at('heartframe', 0.15, 0.4, 0.8),
    at('shelf', 0.85, 0.44, 0.8),
    at('plant', 0.1, 0.74, 1),
    at('lamp', 0.88, 0.72, 1),
    at('rug', 0.5, 0.9, 1),
  ],
  kitchen: () => [
    at('garland', 0.5, 0.05, 1),
    at('cabinet', 0.14, 0.2, 1),
    at('cabinet', 0.27, 0.2, 1),
    at('cabinet', 0.4, 0.2, 1),
    at('fridge', 0.1, 0.62, 1),
    at('counter', 0.5, 0.84, 1),
  ],
  garden: () => [
    at('chair', 0.8, 0.75),
    at('garland', 0.5, 0.05, 1),
    at('plant', 0.1, 0.78, 1),
    at('plant', 0.9, 0.78, 1),
    at('bistroTable', 0.72, 0.74, 1),
  ],
};

/** Bỏ món chưa mở khoá / itemId lạ (an toàn khi tụt tiến độ hoặc đổi catalog). */
export function sanitizeDecor(state: DecorState, daysDone: number): DecorState {
  const clean = (list: Placement[]): Placement[] =>
    list.filter((p) => { const it = itemById(p.itemId); return it != null && daysDone >= it.unlockDays; });
  return { living: clean(state.living), kitchen: clean(state.kitchen), garden: clean(state.garden) };
}
