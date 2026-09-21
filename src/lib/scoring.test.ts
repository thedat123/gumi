import { describe, expect, it } from 'vitest';
import { computeDays, gumiStage, gumiStateOf, longestStreak, missionTotal, streakBonus, totalPoints, TOTAL_DAYS } from './scoring';

const P = (over: Partial<Parameters<typeof computeDays>[0]> = {}) => ({
  campaignDay: 5,
  completed: new Set<number>(),
  passed: new Set<number>(),
  rejected: new Set<number>(),
  ...over,
});
const F = (n: number) => Array<string>(n).fill('future');
const all = (n: number) => computeDays(P({ campaignDay: 22, completed: new Set(Array.from({ length: n }, (_, i) => i + 1)) }));

describe('computeDays', () => {
  it('phân loại checked/passed/rejected/missed/open/future và đủ 21 ngày', () => {
    const days = computeDays(P({ campaignDay: 4, completed: new Set([1, 3]), passed: new Set([2]) }));
    expect(days).toHaveLength(TOTAL_DAYS);
    expect(days).toEqual(['checked', 'passed', 'checked', 'open', ...F(TOTAL_DAYS - 4)]);
  });
  it('ngày trước hôm nay mà chưa làm gì = missed', () => {
    const days = computeDays(P({ campaignDay: 3, completed: new Set([1]) }));
    expect(days[1]).toBe('missed');
    expect(days[2]).toBe('open');
  });
});

describe('longestStreak', () => {
  it('đếm chuỗi dài nhất gồm checked hoặc passed', () => {
    const days = computeDays(P({ campaignDay: 6, completed: new Set([1, 2, 4, 5]), passed: new Set([3]) }));
    expect(longestStreak(days)).toBe(5);
  });
  it('đứt chuỗi khi có missed', () => {
    const days = computeDays(P({ campaignDay: 5, completed: new Set([1, 2, 4]) }));
    expect(longestStreak(days)).toBe(2);
  });
});

describe('điểm', () => {
  it('missionTotal cộng điểm nhiệm vụ, bỏ ngày pass, dùng điểm quiz cho Day 2', () => {
    // Day1=15, Day2 quiz=8, Day3 GAME=15
    const p = P({ completed: new Set([1, 2, 3]), quizScore: 8 });
    expect(missionTotal(p)).toBe(15 + 8 + 15);
  });
  it('streakBonus theo mốc 5/10/15/21 cộng dồn', () => {
    expect(streakBonus(all(5))).toBe(10);
    expect(streakBonus(all(10))).toBe(10 + 20);
    expect(streakBonus(all(15))).toBe(10 + 20 + 30);
    expect(streakBonus(all(21))).toBe(10 + 20 + 30 + 50);
  });
  it('chuỗi dưới mốc 5 thì chưa có thưởng', () => {
    const p = P({ campaignDay: 11, completed: new Set([1, 2, 3]), quizScore: 10 });
    const days = computeDays(p);
    expect(totalPoints(p, days)).toBe(15 + 10 + 15); // 3 ngày, chưa đạt mốc streak
  });
});

describe('Gumi', () => {
  it('gumiStateOf: hấp hối khi dying; tiến hoá khi Day 21 checked; còn lại bơ phờ', () => {
    expect(gumiStateOf(computeDays(P({ campaignDay: 2 })))).toBe('bo_pho');
    expect(gumiStateOf(all(21))).toBe('tien_hoa');
  });
  it('gumiStage 4 nấc theo số ngày đã đi + crash khi gục ngã', () => {
    expect(gumiStage(computeDays(P({ campaignDay: 2 })))).toBe('sleepy');
    expect(gumiStage(all(1))).toBe('balanced');
    expect(gumiStage(all(8))).toBe('charged');
    expect(gumiStage(all(15))).toBe('master');
    const dying = computeDays(P({ campaignDay: 5, completed: new Set([1, 2]) }));
    dying[3] = 'dying';
    expect(gumiStage(dying)).toBe('crash');
  });
});
