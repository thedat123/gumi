// Logic tính điểm/chuỗi/trạng thái — thuần, không phụ thuộc React hay adapter, để test riêng.
// Ở bản Supabase thật, nguồn sự thật là SQL (view + RPC); file này chỉ dùng cho mock adapter và hiển thị phụ.
import { vi } from '../content/vi';
import type { DayState, GumiState } from '../api/types';

export const TOTAL_DAYS = 10;
export const STREAK_BONUS: { n: number; pts: number }[] = [
  { n: 3, pts: 15 },
  { n: 7, pts: 30 },
  { n: 10, pts: 50 },
];

export const missionPoints = (day: number): number => vi.missions[day - 1]?.points ?? 0;

export interface ProgressInput {
  campaignDay: number; // ngày hiện tại của chiến dịch (1..10, >10 = đã hết)
  completed: Set<number>; // ngày đã hoàn thành bằng check-in/nhiệm vụ được duyệt
  passed: Set<number>; // ngày được cứu bằng Sugar Pass (0 điểm, vẫn giữ chuỗi)
  rejected: Set<number>; // ngày bị admin gỡ ảnh
  quizScore?: number; // điểm thực của quiz Day 2 (thay cho điểm phẳng)
}

/** Trạng thái từng ngày cho dải 10 ngày (D1: ngày theo lịch chung). */
export function computeDays(p: ProgressInput): DayState[] {
  const days: DayState[] = [];
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    if (p.passed.has(d)) days.push('passed');
    else if (p.rejected.has(d)) days.push('rejected');
    else if (p.completed.has(d)) days.push('checked');
    else if (d < p.campaignDay) days.push('missed');
    else if (d === p.campaignDay) days.push('open');
    else days.push('future');
  }
  return days;
}

/** Chuỗi = số ngày liên tiếp mà mỗi ngày có check-in được duyệt hoặc được cứu bằng Pass (D4). */
export function longestStreak(days: DayState[]): number {
  let best = 0;
  let run = 0;
  for (const s of days) {
    if (s === 'checked' || s === 'passed') {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

/** Điểm nhiệm vụ: ngày Pass = 0; Day 2 dùng điểm quiz thật; còn lại theo bảng điểm. */
export function missionTotal(p: ProgressInput): number {
  let total = 0;
  for (const d of p.completed) {
    if (p.passed.has(d)) continue;
    total += d === 2 && p.quizScore != null ? p.quizScore : missionPoints(d);
  }
  return total;
}

/** Thưởng chuỗi theo chuỗi DÀI NHẤT, mỗi mốc một lần (D4). */
export function streakBonus(days: DayState[]): number {
  const s = longestStreak(days);
  return STREAK_BONUS.filter((b) => s >= b.n).reduce((sum, b) => sum + b.pts, 0);
}

export function totalPoints(p: ProgressInput, days: DayState[]): number {
  return missionTotal(p) + streakBonus(days);
}

/** Gumi: hấp hối > tiến hoá (đã xong Day 10) > bơ phờ. */
export function gumiStateOf(days: DayState[]): GumiState {
  if (days.includes('dying')) return 'hap_hoi';
  if (days[TOTAL_DAYS - 1] === 'checked') return 'tien_hoa';
  return 'bo_pho';
}

/** Số ngày check-in được duyệt thật (không tính Pass) — dùng cho "All Finishers" (D5). */
export function approvedCount(days: DayState[]): number {
  return days.filter((d) => d === 'checked').length;
}
