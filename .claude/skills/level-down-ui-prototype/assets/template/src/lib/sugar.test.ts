import { describe, expect, it } from 'vitest';
import { gramsPerDrink, gramsToSpoons, weeklySugarGrams } from './sugar';

describe('công thức đường D7', () => {
  it('gam mỗi ly theo mức đường', () => {
    expect([100, 70, 50, 30, 0].map((l) => gramsPerDrink(l as 0 | 30 | 50 | 70 | 100))).toEqual([40, 28, 20, 12, 0]);
  });
  it('đường mỗi tuần = gam × số ly, kể cả biên 0 và 50 ly', () => {
    expect(weeklySugarGrams(100, 7)).toBe(280);
    expect(weeklySugarGrams(50, 0)).toBe(0);
    expect(weeklySugarGrams(70, 50)).toBe(1400);
  });
  it('quy đổi thìa: 4g = 1 thìa, làm tròn 1 chữ số', () => {
    expect(gramsToSpoons(280)).toBe(70);
    expect(gramsToSpoons(10)).toBe(2.5);
    expect(gramsToSpoons(0)).toBe(0);
  });
});
