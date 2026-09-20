import { describe, expect, it } from 'vitest';
import { computeDays, gumiStateOf, longestStreak, missionTotal, streakBonus, totalPoints } from './scoring';

const P = (over: Partial<Parameters<typeof computeDays>[0]> = {}) => ({
  campaignDay: 5,
  completed: new Set<number>(),
  passed: new Set<number>(),
  rejected: new Set<number>(),
  ...over,
});

describe('computeDays', () => {
  it('phân loại checked/passed/rejected/missed/open/future', () => {
    const days = computeDays(P({ campaignDay: 4, completed: new Set([1, 3]), passed: new Set([2]) }));
    expect(days).toEqual(['checked', 'passed', 'checked', 'open', 'future', 'future', 'future', 'future', 'future', 'future']);
    // ngày 2 đã pass, ngày 1,3 checked; ngày 4 = hôm nay (open); còn lại future. Không có missed vì <campaignDay đều đã xử lý.
  });
  it('ngày trước hôm nay mà chưa làm gì = missed', () => {
    const days = computeDays(P({ campaignDay: 3, completed: new Set([1]) }));
    expect(days[1]).toBe('missed'); // ngày 2 bị lỡ
    expect(days[2]).toBe('open');
  });
});

describe('longestStreak', () => {
  it('đếm chuỗi dài nhất gồm checked hoặc passed', () => {
    const days = computeDays(P({ campaignDay: 6, completed: new Set([1, 2, 4, 5]), passed: new Set([3]) }));
    expect(longestStreak(days)).toBe(5); // 1..5 liên tục (3 là pass)
  });
  it('đứt chuỗi khi có missed', () => {
    const days = computeDays(P({ campaignDay: 5, completed: new Set([1, 2, 4]) }));
    expect(longestStreak(days)).toBe(2);
  });
});

describe('điểm', () => {
  it('missionTotal cộng điểm nhiệm vụ, bỏ ngày pass, dùng điểm quiz cho Day 2', () => {
    // Day1=15, Day2 quiz=8 (thay điểm phẳng 10), Day3=10
    const p = P({ completed: new Set([1, 2, 3]), quizScore: 8 });
    expect(missionTotal(p)).toBe(15 + 8 + 10);
  });
  it('streakBonus theo mốc 3/7/10 cộng dồn', () => {
    const days7 = computeDays(P({ campaignDay: 11, completed: new Set([1, 2, 3, 4, 5, 6, 7]) }));
    expect(streakBonus(days7)).toBe(15 + 30); // đạt mốc 3 và 7
    const days10 = computeDays(P({ campaignDay: 11, completed: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) }));
    expect(streakBonus(days10)).toBe(15 + 30 + 50);
  });
  it('totalPoints = nhiệm vụ + thưởng chuỗi', () => {
    const p = P({ campaignDay: 11, completed: new Set([1, 2, 3]), quizScore: 10 });
    const days = computeDays(p);
    expect(totalPoints(p, days)).toBe(15 + 10 + 10 + 15); // 3 ngày + mốc streak 3
  });
});

describe('gumiStateOf', () => {
  it('hấp hối khi có dying; tiến hoá khi Day 10 checked; còn lại bơ phờ', () => {
    expect(gumiStateOf(computeDays(P({ campaignDay: 2 })))).toBe('bo_pho');
    const done = computeDays(P({ campaignDay: 11, completed: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) }));
    expect(gumiStateOf(done)).toBe('tien_hoa');
  });
});
