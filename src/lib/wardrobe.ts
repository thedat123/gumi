// Tủ đồ PHỐI TỰ DO của Gumi: mỗi nhóm (mũ / kính / khăn / màu / nền) chọn độc lập.
// Mở khoá dần theo số ngày đã hoàn thành (prototype suy từ tiến độ; bản thật chốt ở server).

export type Slot = 'hat' | 'glasses' | 'neck' | 'color' | 'background';

export interface Item {
  id: string;
  name: string;
  unlockDays: number; // số ngày hoàn thành để mở khoá
  swatch: string;     // màu đại diện ở ô chọn
}

export interface Outfit { hat: string; glasses: string; neck: string; color: string; background: string }
export const DEFAULT_OUTFIT: Outfit = { hat: 'none', glasses: 'none', neck: 'none', color: 'default', background: 'none' };

/** Thứ tự tab trong tủ đồ. `icon` dùng tên Icon có sẵn. */
export const SLOTS: { slot: Slot; label: string; icon: string }[] = [
  { slot: 'hat', label: 'Mũ', icon: 'shirt' },
  { slot: 'glasses', label: 'Kính', icon: 'sparkle' },
  { slot: 'neck', label: 'Khăn', icon: 'heart' },
  { slot: 'color', label: 'Màu', icon: 'paw' },
  { slot: 'background', label: 'Nền', icon: 'star' },
];

const N = (id: string, name: string, unlockDays: number, swatch: string): Item => ({ id, name, unlockDays, swatch });

export const WARDROBE: Record<Slot, Item[]> = {
  hat: [
    N('none', 'Không', 0, 'transparent'),
    N('cap', 'Mũ lưỡi trai', 0, '#4f9e5d'),
    N('bow', 'Nơ xinh', 1, '#E7799B'),
    N('beanie', 'Mũ len', 3, '#C9603F'),
    N('party', 'Mũ tiệc', 5, '#F5C542'),
    N('headband', 'Băng đô ninja', 7, '#B3261E'),
    N('helmet', 'Mũ phi hành', 12, '#7EC9E0'),
    N('crown', 'Vương miện', 15, '#F5C542'),
    N('halo', 'Hào quang', 21, '#F2C879'),
  ],
  glasses: [
    N('none', 'Không', 0, 'transparent'),
    N('round', 'Kính tròn', 1, '#C79A3E'),
    N('sunglasses', 'Kính râm', 4, '#2A2320'),
    N('star', 'Kính sao', 10, '#F5C542'),
    N('monocle', 'Kính một mắt', 15, '#C79A3E'),
  ],
  neck: [
    N('none', 'Không', 0, 'transparent'),
    N('bowtie', 'Nơ cổ', 2, '#B3261E'),
    N('scarf', 'Khăn quàng', 5, '#5B8AC9'),
    N('necklace', 'Vòng cổ', 9, '#F5C542'),
    N('cape', 'Áo choàng', 14, '#7A4DB3'),
  ],
  color: [
    N('default', 'Cam Gốc', 0, '#E3A57C'),
    N('gray', 'Xám Khói', 0, '#8A9096'),
    N('cream', 'Kem Sữa', 3, '#EFC9A2'),
    N('mint', 'Bạc Hà', 6, '#8FD0B0'),
    N('blue', 'Xanh Biển', 9, '#9EC6E6'),
    N('pink', 'Hồng Đào', 12, '#F0B4C4'),
    N('gold', 'Vàng Thần', 18, '#F2C879'),
  ],
  background: [
    N('none', 'Không', 0, 'transparent'),
    N('spotlight', 'Ánh đèn', 0, '#FFE6A8'),
    N('hearts', 'Tim bay', 4, '#F4A6C0'),
    N('stars', 'Sao lấp lánh', 8, '#BFD8F2'),
    N('sunburst', 'Tia nắng', 13, '#FFD27A'),
    N('confetti', 'Kim tuyến', 20, '#8FD0B0'),
  ],
};

/** Bảng màu lông theo lựa chọn (đổ vào CSS var của mascot). */
export const BODY_COLORS: Record<string, { gumi: string; dark: string; belly: string }> = {
  default: { gumi: '#E3A57C', dark: '#C97E4A', belly: '#FBEFE4' },
  gray: { gumi: '#9AA0A6', dark: '#5f6368', belly: '#ECEFF1' },
  cream: { gumi: '#EFC9A2', dark: '#9c6b4a', belly: '#FFF3E0' },
  mint: { gumi: '#9FD8B8', dark: '#5AA98A', belly: '#EAF7F0' },
  blue: { gumi: '#9EC6E6', dark: '#5E86AE', belly: '#EAF2FB' },
  pink: { gumi: '#F0B4C4', dark: '#C97A93', belly: '#FDECF1' },
  gold: { gumi: '#F2C879', dark: '#C79A3E', belly: '#FFF6DD' },
};

export const itemById = (slot: Slot, id: string): Item =>
  WARDROBE[slot].find((i) => i.id === id) ?? WARDROBE[slot][0]!;
export const isUnlocked = (item: Item, daysDone: number): boolean => daysDone >= item.unlockDays;
export const totalItems = (): number => Object.values(WARDROBE).reduce((n, list) => n + list.length, 0);
export const unlockedItems = (daysDone: number): number =>
  Object.values(WARDROBE).reduce((n, list) => n + list.filter((i) => daysDone >= i.unlockDays).length, 0);

/** Làm sạch outfit: món chưa mở khoá → quay về mặc định của nhóm (an toàn khi tụt tiến độ). */
export function sanitizeOutfit(o: Outfit, daysDone: number): Outfit {
  const pick = (slot: Slot, id: string) => (isUnlocked(itemById(slot, id), daysDone) ? id : WARDROBE[slot][0]!.id);
  return {
    hat: pick('hat', o.hat), glasses: pick('glasses', o.glasses), neck: pick('neck', o.neck),
    color: pick('color', o.color), background: pick('background', o.background),
  };
}
