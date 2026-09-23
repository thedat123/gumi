import { describe, expect, it } from 'vitest';
import { hasStamp } from './ocr';

describe('hasStamp — nhận diện tem/hoá đơn ly nước', () => {
  it('nhận ra hoá đơn/tem đồ uống', () => {
    expect(hasStamp('TRA SUA TRAN CHAU\nSize L - 50% duong\n500ml  35.000d')).toBe(true);
    expect(hasStamp('Trà đào cam sả · size M · 70% đường')).toBe(true);
    expect(hasStamp('HIGHLANDS COFFEE\nOrder #123\nTotal 45,000')).toBe(true);
    expect(hasStamp('nuoc ep · 0% · 350ml')).toBe(true);
  });
  it('từ chối ảnh không có chữ tem hợp lệ', () => {
    expect(hasStamp('')).toBe(false);
    expect(hasStamp('   ')).toBe(false);
    expect(hasStamp('abc')).toBe(false);
    expect(hasStamp('hello world random')).toBe(false);
  });
});
