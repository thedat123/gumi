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

/** Bảng màu lông theo lựa chọn (đổ vào CSS var của mascot). cheek = má ửng, nose = mũi. */
export const BODY_COLORS: Record<string, { gumi: string; dark: string; belly: string; cheek: string; nose: string }> = {
  default: { gumi: '#F5A31C', dark: '#D9820F', belly: '#F8DBCC', cheek: '#F58C86', nose: '#C9764E' },
  gray: { gumi: '#A7ADB3', dark: '#7C838A', belly: '#ECEFF1', cheek: '#E39FA0', nose: '#6E6A70' },
  cream: { gumi: '#F0CB94', dark: '#D0A860', belly: '#FFF3E0', cheek: '#F19E86', nose: '#B98A64' },
  mint: { gumi: '#8FD3AE', dark: '#5FAE86', belly: '#EAF7F0', cheek: '#EF9AA0', nose: '#5FA98A' },
  blue: { gumi: '#93C2E8', dark: '#5E8FBE', belly: '#EAF2FB', cheek: '#EE9BAE', nose: '#6E86AE' },
  pink: { gumi: '#F3A6BC', dark: '#D97C97', belly: '#FDECF1', cheek: '#EA7E97', nose: '#C97A93' },
  gold: { gumi: '#F3C74E', dark: '#D5A426', belly: '#FFF6DD', cheek: '#F0A46E', nose: '#C79A4E' },
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
