// Bảng nạp code minigame theo ngày — tách riêng để màn Chương tải TRƯỚC game của hôm nay (lúc người chơi đọc truyện).
//   2 Quiz · 3 Day7 · 5 SortGame · 7 FlappyBird · 8 QuickQuiz · 9 WordHunt · 11 Crossword · 12 MemoryMatch · 14 Day14Final
//   1,4,6,10,13 (DRINK/SHARE) → CheckIn ảnh
import type { ComponentType } from 'react';

type Loader = () => Promise<{ default: ComponentType }>;

export const CHECKIN: Loader = () => import('./CheckIn').then((m) => ({ default: m.CheckIn }));
export const GAMES: Record<number, Loader> = {
  2: () => import('./Quiz').then((m) => ({ default: m.Quiz })),
  3: () => import('./Day7').then((m) => ({ default: m.Day7 })),
  5: () => import('./minigames/SortGame').then((m) => ({ default: m.SortGame })),
  7: () => import('./minigames/FlappyBird').then((m) => ({ default: m.FlappyBird })),
  8: () => import('./minigames/QuickQuiz').then((m) => ({ default: m.QuickQuiz })),
  9: () => import('./minigames/WordHunt').then((m) => ({ default: m.WordHunt })),
  11: () => import('./minigames/Crossword').then((m) => ({ default: m.Crossword })),
  12: () => import('./minigames/MemoryMatch').then((m) => ({ default: m.MemoryMatch })),
  14: () => import('./minigames/Day14Final').then((m) => ({ default: m.Day14Final })),
};

export const loaderFor = (day: number): Loader => GAMES[day] ?? CHECKIN;

/** Tải nền code game của ngày `day` (lỗi mạng bỏ qua — lúc mở màn sẽ tải lại). */
export function preloadMission(day: number) { void loaderFor(day)().catch(() => {}); }
