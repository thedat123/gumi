import { describe, expect, it } from 'vitest';
import { ageGroupOf, groupByAge, isValidAge, medianAge } from './age';

describe('age', () => {
  it('validates range 6–99', () => {
    expect(isValidAge(6)).toBe(true);
    expect(isValidAge(99)).toBe(true);
    expect(isValidAge(5)).toBe(false);
    expect(isValidAge(100)).toBe(false);
    expect(isValidAge(20.5)).toBe(false);
    expect(isValidAge(null)).toBe(false);
  });

  it('maps ages to groups at boundaries', () => {
    expect(ageGroupOf(17)?.id).toBe('u18');
    expect(ageGroupOf(18)?.id).toBe('18_22');
    expect(ageGroupOf(22)?.id).toBe('18_22');
    expect(ageGroupOf(23)?.id).toBe('23_29');
    expect(ageGroupOf(39)?.id).toBe('30_39');
    expect(ageGroupOf(40)?.id).toBe('40p');
    expect(ageGroupOf(null)).toBeNull();
  });

  it('groups items and keeps unanswered separately', () => {
    const { rows, unknown } = groupByAge([{ age: 16 }, { age: 20 }, { age: 21 }, { age: null }, {}]);
    expect(rows.find((r) => r.group.id === '18_22')!.items).toHaveLength(2);
    expect(rows.find((r) => r.group.id === 'u18')!.items).toHaveLength(1);
    expect(unknown).toHaveLength(2);
  });

  it('computes median age', () => {
    expect(medianAge([30, 20, null, 25])).toBe(25);
    expect(medianAge([20, 21])).toBe(21);
    expect(medianAge([null])).toBeNull();
  });
});
