// Skin của Gumi: mở khoá dần theo số ngày đã hoàn thành. Ở bản thật nên chốt unlock ở server;
// prototype lưu lựa chọn ở localStorage và suy ra "đã mở khoá" từ tiến độ hành trình.
export type Accessory = 'none' | 'cap' | 'headband' | 'helmet' | 'crown' | 'halo';

export interface Skin {
  id: string;
  name: string;
  blurb: string;
  unlockDays: number; // số ngày hoàn thành để mở khoá
  accessory: Accessory;
  accessoryColor?: string;
  colors?: { gumi?: string; dark?: string; belly?: string };
  swatch: string; // màu đại diện ở ô chọn
}

export const SKINS: Skin[] = [
  { id: 'default', name: 'Gumi Gốc', blurb: 'Chú mèo bơ phờ thuở ban đầu.', unlockDays: 0, accessory: 'none', swatch: '#E3A57C' },
  { id: 'swamp', name: 'Thám Hiểm', blurb: 'Đi được 3 ngày — nhận mũ phiêu lưu.', unlockDays: 3, accessory: 'cap', accessoryColor: '#4f9e5d', colors: { belly: '#EAF3E4' }, swatch: '#4f9e5d' },
  { id: 'ninja', name: 'Ninja Bớt Ngọt', blurb: 'Hết Hồi 1 — hoá ninja lì đòn trước Cơn Thèm.', unlockDays: 7, accessory: 'headband', accessoryColor: '#B3261E', colors: { gumi: '#9AA0A6', dark: '#5f6368', belly: '#ECEFF1' }, swatch: '#5f6368' },
  { id: 'astro', name: 'Phi Hành Gia', blurb: 'Xuyên Rừng Đường Ẩn — bay vào vũ trụ 0%.', unlockDays: 12, accessory: 'helmet', accessoryColor: '#bfe6f2', colors: { belly: '#EAF6FB' }, swatch: '#7ec9e0' },
  { id: 'royal', name: 'Hoàng Gia', blurb: 'Chạm Đỉnh 0% — đội vương miện đường-thủ.', unlockDays: 15, accessory: 'crown', accessoryColor: '#F5C542', colors: { gumi: '#EFC9A2', dark: '#9c6b4a', belly: '#FFF3E0' }, swatch: '#F5C542' },
  { id: 'master', name: 'Chiến Thần Vàng', blurb: 'Tốt nghiệp 21 ngày — hào quang Sugar Master.', unlockDays: 21, accessory: 'halo', accessoryColor: '#F5C542', colors: { gumi: '#F2C879', dark: '#C79A3E', belly: '#FFF6DD' }, swatch: '#F2C879' },
];

export const skinById = (id: string): Skin => SKINS.find((s) => s.id === id) ?? SKINS[0]!;
export const unlockedSkins = (daysDone: number): Skin[] => SKINS.filter((s) => daysDone >= s.unlockDays);
