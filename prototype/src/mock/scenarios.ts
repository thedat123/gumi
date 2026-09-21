// Dữ liệu giả cho prototype. KHÔNG dùng ở bản thật: bản thật lấy từ RPC (get_my_journey, get_leaderboard...).
export type DayState = 'checked' | 'passed' | 'open' | 'dying' | 'missed' | 'rejected' | 'future';
export type GumiState = 'bo_pho' | 'hap_hoi' | 'tien_hoa';
export type ScenarioId = 'before_start' | 'today_open' | 'today_done' | 'dying' | 'missed_no_pass' | 'rejected_day' | 'finished' | 'ended';

export const TOTAL_DAYS = 21;
export const BOSS_DAYS = [7, 14, 21] as const;
export const MAX_POINTS = 395; // tổng điểm nhiệm vụ 21 ngày (prototype — người phụ trách duyệt lại)

export interface Scenario {
  id: ScenarioId;
  label: string;
  phase: 'before' | 'running' | 'ended';
  day: number;
  days: DayState[];
  totalPoints: number;
  streak: number;
  rank: number;
  passAvailable: boolean;
  passHoursLeft: number | null;
  rejectedReason?: string;
}

const C: DayState = 'checked', O: DayState = 'open', F: DayState = 'future';
const fut = (n: number): DayState[] => Array<DayState>(n).fill(F);
const pad = (days: DayState[]): DayState[] => days.length >= TOTAL_DAYS ? days.slice(0, TOTAL_DAYS) : [...days, ...fut(TOTAL_DAYS - days.length)];

export const SCENARIOS: Scenario[] = [
  { id: 'before_start', label: 'Trước ngày bắt đầu', phase: 'before', day: 0, days: fut(TOTAL_DAYS), totalPoints: 0, streak: 0, rank: 0, passAvailable: true, passHoursLeft: null },
  { id: 'today_open', label: 'Hôm nay chưa làm', phase: 'running', day: 4, days: pad([C, C, C, O]), totalPoints: 50, streak: 3, rank: 24, passAvailable: true, passHoursLeft: null },
  { id: 'today_done', label: 'Hôm nay đã xong', phase: 'running', day: 4, days: pad([C, C, C, C]), totalPoints: 60, streak: 4, rank: 18, passAvailable: true, passHoursLeft: null },
  { id: 'dying', label: 'Gumi bị quật ngã', phase: 'running', day: 5, days: pad([C, C, C, 'dying', O]), totalPoints: 50, streak: 3, rank: 31, passAvailable: true, passHoursLeft: 9 },
  { id: 'missed_no_pass', label: 'Lỡ, hết Bùa', phase: 'running', day: 6, days: pad([C, 'passed', C, 'missed', C, O]), totalPoints: 60, streak: 1, rank: 40, passAvailable: false, passHoursLeft: null },
  { id: 'rejected_day', label: 'Ảnh bị gỡ', phase: 'running', day: 4, days: pad([C, C, 'rejected', O]), totalPoints: 25, streak: 2, rank: 52, passAvailable: true, passHoursLeft: 14, rejectedReason: 'ảnh không phải ly nước' },
  { id: 'finished', label: 'Đã tốt nghiệp', phase: 'running', day: TOTAL_DAYS, days: Array<DayState>(TOTAL_DAYS).fill(C), totalPoints: MAX_POINTS, streak: TOTAL_DAYS, rank: 6, passAvailable: true, passHoursLeft: null },
  { id: 'ended', label: 'Hành trình kết thúc', phase: 'ended', day: 23, days: pad([C, C, C, C, C, C, 'missed', C, C, C, C, C, C, C, C, C, 'missed', C, C, C, C]), totalPoints: 300, streak: 7, rank: 9, passAvailable: true, passHoursLeft: null },
];

export const scenarioById = (id: string | null): Scenario => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[1]!;

/** Quy tắc trạng thái Gumi: bị quật ngã (hấp hối) > tiến hoá (đã xong Day 21) > bơ phờ. */
export function gumiStateOf(s: Scenario): GumiState {
  if (s.days.includes('dying')) return 'hap_hoi';
  if (s.days[TOTAL_DAYS - 1] === 'checked') return 'tien_hoa';
  return 'bo_pho';
}

export const checkedCount = (s: Scenario): number => s.days.filter((d) => d === 'checked').length;

/** Tiến độ 0..1 để Gumi "khoẻ" dần (bụng nhỏ lại) theo số ngày đã xong. */
export const progressOf = (s: Scenario): number => Math.min(1, checkedCount(s) / TOTAL_DAYS);

/** Vùng đất (hồi) theo ngày: 1 = Đầm Lầy Ngọt, 2 = Rừng Đường Ẩn, 3 = Đỉnh 0%. */
export const actOfDay = (day: number): 1 | 2 | 3 => (day <= 7 ? 1 : day <= 14 ? 2 : 3);
export const isBossDay = (day: number): boolean => (BOSS_DAYS as readonly number[]).includes(day);

export interface LeaderRow { rank: number; name: string; avatar: string; points: number }
export const TOP10: LeaderRow[] = [
  ['Mai Anh', '🐱', 240], ['Quang Huy', '🦊', 232], ['Bảo Ngọc', '🐰', 226], ['Thanh Tùng', '🐻', 219], ['Phương Linh', '🐼', 210],
  ['Đức Minh', '🐯', 204], ['Khánh Vy', '🐨', 197], ['Hoàng Nam', '🦁', 190], ['Ngọc Diệp', '🐸', 184], ['Gia Bảo', '🐷', 178],
].map(([name, avatar, points], i) => ({ rank: i + 1, name: name as string, avatar: avatar as string, points: points as number }));
