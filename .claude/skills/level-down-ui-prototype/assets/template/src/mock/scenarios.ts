// Dữ liệu giả cho prototype. KHÔNG dùng ở bản thật: bản thật lấy từ RPC (get_my_journey, get_leaderboard...).
export type DayState = 'checked' | 'passed' | 'open' | 'dying' | 'missed' | 'rejected' | 'future';
export type GumiState = 'bo_pho' | 'hap_hoi' | 'tien_hoa';
export type ScenarioId = 'before_start' | 'today_open' | 'today_done' | 'dying' | 'missed_no_pass' | 'rejected_day' | 'finished' | 'ended';

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

export const SCENARIOS: Scenario[] = [
  { id: 'before_start', label: 'Trước ngày bắt đầu', phase: 'before', day: 0, days: fut(10), totalPoints: 0, streak: 0, rank: 0, passAvailable: true, passHoursLeft: null },
  { id: 'today_open', label: 'Hôm nay chưa làm', phase: 'running', day: 4, days: [C, C, C, O, ...fut(6)], totalPoints: 50, streak: 3, rank: 24, passAvailable: true, passHoursLeft: null },
  { id: 'today_done', label: 'Hôm nay đã xong', phase: 'running', day: 4, days: [C, C, C, C, ...fut(6)], totalPoints: 60, streak: 4, rank: 18, passAvailable: true, passHoursLeft: null },
  { id: 'dying', label: 'Gumi hấp hối', phase: 'running', day: 5, days: [C, C, C, 'dying', O, ...fut(5)], totalPoints: 50, streak: 3, rank: 31, passAvailable: true, passHoursLeft: 9 },
  { id: 'missed_no_pass', label: 'Lỡ, hết Pass', phase: 'running', day: 6, days: [C, 'passed', C, 'missed', C, O, ...fut(4)], totalPoints: 60, streak: 1, rank: 40, passAvailable: false, passHoursLeft: null },
  { id: 'rejected_day', label: 'Ảnh bị gỡ', phase: 'running', day: 4, days: [C, C, 'rejected', O, ...fut(6)], totalPoints: 25, streak: 2, rank: 52, passAvailable: true, passHoursLeft: 14, rejectedReason: 'ảnh không phải ly nước' },
  { id: 'finished', label: 'Đã tốt nghiệp', phase: 'running', day: 10, days: Array<DayState>(10).fill(C), totalPoints: 260, streak: 10, rank: 6, passAvailable: true, passHoursLeft: null },
  { id: 'ended', label: 'Chiến dịch kết thúc', phase: 'ended', day: 12, days: [C, C, C, C, C, C, 'missed', C, C, C], totalPoints: 205, streak: 3, rank: 9, passAvailable: true, passHoursLeft: null },
];

export const scenarioById = (id: string | null): Scenario => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[1]!;

/** Quy tắc trạng thái Gumi: hấp hối > tiến hoá (đã xong Day 10) > bơ phờ. */
export function gumiStateOf(s: Scenario): GumiState {
  if (s.days.includes('dying')) return 'hap_hoi';
  if (s.days[9] === 'checked') return 'tien_hoa';
  return 'bo_pho';
}

export const checkedCount = (s: Scenario): number => s.days.filter((d) => d === 'checked').length;

export interface LeaderRow { rank: number; name: string; avatar: string; points: number }
export const TOP10: LeaderRow[] = [
  ['Mai Anh', '🐱', 240], ['Quang Huy', '🦊', 232], ['Bảo Ngọc', '🐰', 226], ['Thanh Tùng', '🐻', 219], ['Phương Linh', '🐼', 210],
  ['Đức Minh', '🐯', 204], ['Khánh Vy', '🐨', 197], ['Hoàng Nam', '🦁', 190], ['Ngọc Diệp', '🐸', 184], ['Gia Bảo', '🐷', 178],
].map(([name, avatar, points], i) => ({ rank: i + 1, name: name as string, avatar: avatar as string, points: points as number }));
