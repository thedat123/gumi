import { describe, expect, it } from 'vitest';
import { drinkTarget, judgeDrink, readSugarPercent } from './drinkChallenge';
import type { VlmResult } from './vlm';

const evidence = (sugarPercent: number | null, extras: Partial<VlmResult> = {}): VlmResult => ({
  available: true, ran: true, ok: true, isDrink: true, drink: 'trà', sugarPercent,
  confidence: .9, reason: '', ...extras,
});

describe('DRINK challenge validation', () => {
  it('requires one step below each player baseline on day 1', () => {
    expect(drinkTarget(1, 100)).toBe(70);
    expect(drinkTarget(1, 70)).toBe(50);
    expect(drinkTarget(1, 50)).toBe(30);
    expect(judgeDrink(1, 70, evidence(60)).kind).toBe('fail');
    expect(judgeDrink(1, 70, evidence(50)).kind).toBe('pass');
  });

  it('uses the actual percentage rather than a rounded level to decide pass or fail', () => {
    expect(judgeDrink(5, 100, evidence(51)).kind).toBe('fail');
    expect(judgeDrink(15, 100, evidence(29)).kind).toBe('pass');
    expect(judgeDrink(20, 100, evidence(5)).kind).toBe('fail');
  });

  it('does not invent a percentage when the label cannot be read', () => {
    expect(judgeDrink(5, 100, evidence(null)).kind).toBe('unknown');
    expect(judgeDrink(20, 100, evidence(null, { isUnsweetened: true })).kind).toBe('pass');
    expect(judgeDrink(10, 100, evidence(null, { isHomemade: true, isUnsweetened: true })).kind).toBe('pass');
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
});
