// Tủ đồ PHỐI TỰ DO của Gumi: mỗi nhóm (mũ / kính / khăn / màu / nền) chọn độc lập.
// Mở khoá dần theo số ngày đã hoàn thành (prototype suy từ tiến độ; bản thật chốt ở server).

export type Slot = 'hat' | 'glasses' | 'neck' | 'jersey' | 'color' | 'background';

export interface Item {
  id: string;
  name: string;
  unlockDays: number; // số ngày hoàn thành để mở khoá
  swatch: string;     // màu đại diện ở ô chọn
}

export interface Outfit { hat: string; glasses: string; neck: string; jersey: string; color: string; background: string }
export const DEFAULT_OUTFIT: Outfit = { hat: 'none', glasses: 'none', neck: 'none', jersey: 'none', color: 'default', background: 'none' };

/** Thứ tự tab trong tủ đồ. `icon` là tên Icon TƯƠNG ỨNG nhóm (áo = shirt, mũ = hat, kính = glasses…). */
export const SLOTS: { slot: Slot; label: string; icon: string }[] = [
  { slot: 'hat', label: 'Mũ', icon: 'hat' },
  { slot: 'glasses', label: 'Kính', icon: 'glasses' },
  { slot: 'neck', label: 'Khăn', icon: 'scarf' },
  { slot: 'jersey', label: 'Áo', icon: 'shirt' },
  { slot: 'color', label: 'Màu', icon: 'palette' },
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
    N('crown', 'Vương miện', 13, '#F5C542'),
    N('halo', 'Hào quang', 14, '#F2C879'),
  ],
  glasses: [
    N('none', 'Không', 0, 'transparent'),
    N('round', 'Kính tròn', 1, '#C79A3E'),
    N('sunglasses', 'Kính râm', 4, '#2A2320'),
    N('star', 'Kính sao', 10, '#F5C542'),
    N('monocle', 'Kính một mắt', 14, '#C79A3E'),
  ],
  neck: [
    N('none', 'Không', 0, 'transparent'),
    N('bowtie', 'Nơ cổ', 2, '#B3261E'),
    N('scarf', 'Khăn quàng', 5, '#5B8AC9'),
    N('necklace', 'Vòng cổ', 9, '#F5C542'),
    N('cape', 'Áo choàng', 14, '#7A4DB3'),
  ],
  // Áo đấu các đội LoL esports (màu & tên viết tắt cách điệu, không dùng logo gốc).
  // 3 đội Việt Nam (VCS) lên đầu cho "gà nhà", rồi tới các đội quốc tế nổi bật.
  jersey: [
    N('none', 'Không', 0, 'transparent'),
    N('gam', 'GAM Esports', 0, '#F3C533'),
    N('tsw', 'Team Whales', 0, '#0E2A47'),
    N('viking', 'Vikings Esports', 1, '#E0492A'),
    N('t1', 'T1', 0, '#E51C3A'),
    N('geng', 'Gen.G', 0, '#C5A25A'),
    N('hle', 'Hanwha Life', 1, '#17191C'),
    N('dk', 'Dplus KIA', 2, '#55D3BD'),
    N('kt', 'KT Rolster', 3, '#E6323B'),
    N('jdg', 'JD Gaming', 5, '#C72C42'),
    N('blg', 'Bilibili Gaming', 6, '#267BC5'),
    N('tes', 'Top Esports', 8, '#ED6432'),
    N('g2', 'G2 Esports', 10, '#1C1E24'),
    N('fnc', 'Fnatic', 12, '#FF862F'),
  ],
  color: [
    N('default', 'Vàng Gumi', 0, '#FAB20A'),
    N('cream', 'Kem Sữa', 0, '#FADED2'),
    N('rose', 'Hồng Phấn', 3, '#DC97A5'),
    N('blue', 'Xanh Lam', 6, '#3966A4'),
    N('burgundy', 'Đỏ Mận', 12, '#B83556'),
    N('brown', 'Nâu Ca Cao', 14, '#845747'),
  ],
  background: [
    N('none', 'Không', 0, 'transparent'),
    N('spotlight', 'Ánh đèn', 0, '#FFE6A8'),
    N('hearts', 'Tim bay', 4, '#F4A6C0'),
    N('stars', 'Sao lấp lánh', 8, '#BFD8F2'),
    N('sunburst', 'Tia nắng', 13, '#FFD27A'),
    N('confetti', 'Kim tuyến', 14, '#8FD0B0'),
  ],
};

/** Signature team colourways, intentionally independent of a tournament or season. */
export const JERSEY_COLORWAYS: Record<string, string> = {
  gam: 'Đen · Vàng GAM', tsw: 'Navy · Xanh biển', viking: 'Đen · Đỏ lửa',
  t1: 'Đỏ T1 · Đen', geng: 'Đen · Gold', hle: 'Đen · Viền cam kép',
  dk: 'Mint · Đen', kt: 'Đỏ · Trắng', jdg: 'Đỏ · Navy',
  blg: 'Xanh lam · Hồng', tes: 'Cam · Đen', g2: 'Đen · Trắng', fnc: 'Đen · Cam Fnatic',
};

/** Bảng màu lông theo lựa chọn (đổ vào CSS var của mascot). cheek = má ửng, nose = mũi. */
export const BODY_COLORS: Record<string, { gumi: string; dark: string; belly: string; cheek: string; nose: string }> = {
  default: { gumi: '#FAB20A', dark: '#D79209', belly: '#FADED2', cheek: '#DC97A5', nose: '#845747' },
  cream: { gumi: '#FADED2', dark: '#D7B6AA', belly: '#FFF3EA', cheek: '#DC97A5', nose: '#845747' },
  rose: { gumi: '#DC97A5', dark: '#BA7382', belly: '#FADED2', cheek: '#B83556', nose: '#845747' },
  blue: { gumi: '#3966A4', dark: '#294C80', belly: '#FADED2', cheek: '#DC97A5', nose: '#845747' },
  burgundy: { gumi: '#B83556', dark: '#8F2944', belly: '#FADED2', cheek: '#DC97A5', nose: '#845747' },
  brown: { gumi: '#845747', dark: '#634035', belly: '#FADED2', cheek: '#DC97A5', nose: '#845747' },
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
    jersey: pick('jersey', o.jersey), color: pick('color', o.color), background: pick('background', o.background),
  };
}
