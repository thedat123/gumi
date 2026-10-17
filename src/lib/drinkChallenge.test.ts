import { describe, expect, it } from 'vitest';
import { judgeDrink, readSugarPercent } from './drinkChallenge';
import type { VlmResult } from './vlm';

const evidence = (sugarPercent: number | null, extras: Partial<VlmResult> = {}): VlmResult => ({
  available: true, ran: true, ok: true, isDrink: true, drink: 'trà', sugarPercent,
  confidence: .9, reason: '', ...extras,
});

describe('DRINK challenge validation', () => {
  it('day 1 passes any reduction below the registered baseline', () => {
    // Chỉ cần THẤP HƠN thói quen đăng ký là đạt (giảm bất kỳ, không bắt đúng 1 nấc).
    expect(judgeDrink(1, 100, evidence(70)).kind).toBe('pass'); // 100 → 70 là hạ
    expect(judgeDrink(1, 100, evidence(80)).kind).toBe('pass'); // 80 vẫn thấp hơn 100 → đạt
    expect(judgeDrink(1, 100, evidence(100)).kind).toBe('fail'); // bằng thói quen → chưa hạ
    expect(judgeDrink(1, 70, evidence(60)).kind).toBe('pass');  // 60 < 70 → đạt
    expect(judgeDrink(1, 70, evidence(70)).kind).toBe('fail');  // bằng thói quen → trượt
    expect(judgeDrink(1, 70, evidence(50)).kind).toBe('pass');
  });

  it('day 6 yêu cầu tối đa 70% đường', () => {
    // Ngày 6 (DRINK): gate ở mức tối đa 70% đường.
    expect(judgeDrink(6, 100, evidence(70)).kind).toBe('pass'); // đúng mốc 70% → đạt
    expect(judgeDrink(6, 100, evidence(51)).kind).toBe('pass');
    expect(judgeDrink(6, 100, evidence(90)).kind).toBe('fail'); // quá 70% → trượt
    expect(judgeDrink(6, 100, evidence(null)).kind).toBe('unknown'); // không đọc được % → chờ duyệt tay
  });

  it('does not invent a percentage when the label cannot be read', () => {
    expect(judgeDrink(1, 100, evidence(null)).kind).toBe('unknown'); // ngày 1 cần đọc được mức để so baseline
    expect(judgeDrink(10, 100, evidence(null, { isHomemade: true, isUnsweetened: true })).kind).toBe('pass'); // DIY không đường
    expect(judgeDrink(10, 100, evidence(50, { isHomemade: true })).kind).toBe('fail');
    expect(judgeDrink(10, 100, evidence(50, { isHomemade: true, isUnsweetened: true })).kind).toBe('fail');
    expect(judgeDrink(10, 100, evidence(null)).kind).toBe('unknown');
  });

  it('reads percentages only when tied to sugar, avoiding unrelated percentages', () => {
    expect(readSugarPercent('70% đường')).toBe(70);
    expect(readSugarPercent('Đường 30%')).toBe(30);
    expect(readSugarPercent('Giảm giá 50%')).toBeNull();
    expect(readSugarPercent('không đường')).toBe(0);
  });

  it('reads sweetness written the way VN shops actually print it', () => {
    expect(readSugarPercent('70% ngọt')).toBe(70);        // tem ghi "ngọt" thay vì "đường"
    expect(readSugarPercent('Ngọt 50')).toBe(50);
    expect(readSugarPercent('Đường: 30')).toBe(30);        // dấu hai chấm, không có %
    expect(readSugarPercent('Đường 70')).toBe(70);         // không có dấu %
    expect(readSugarPercent('ít đường')).toBe(30);         // định tính
    expect(readSugarPercent('nửa ngọt')).toBe(50);
    expect(readSugarPercent('không ngọt')).toBe(0);
    expect(readSugarPercent('sugar free')).toBe(0);
    expect(readSugarPercent('Size L, trà sữa 500ml')).toBeNull(); // không có mức đường thật
    expect(judgeDrink(1, 100, evidence(readSugarPercent('70% ngọt'))).kind).toBe('pass');
  });
});
