import { describe, expect, it } from 'vitest';
import { parseIso, timeAgo } from './timeAgo';

const NOW = Date.parse('2026-10-25T12:00:00Z');

describe('timeAgo', () => {
  it('đọc được múi giờ rút gọn "+00" / "+07" của Postgres', () => {
    expect(parseIso('2026-10-25T10:00:00+00')).toBe(Date.parse('2026-10-25T10:00:00Z'));
    expect(parseIso('2026-10-25T17:00:00+07')).toBe(Date.parse('2026-10-25T10:00:00Z'));
    expect(parseIso('2026-10-25 10:00:00+00')).toBe(Date.parse('2026-10-25T10:00:00Z'));
    expect(parseIso('2026-10-25T10:00:00.123Z')).toBe(Date.parse('2026-10-25T10:00:00.123Z'));
  });
  it('tính đúng khoảng thời gian', () => {
    expect(timeAgo('2026-10-25T11:59:30Z', NOW)).toBe('vừa xong');
    expect(timeAgo('2026-10-25T11:45:00+00', NOW)).toBe('15 phút trước');
    expect(timeAgo('2026-10-25T09:00:00+00', NOW)).toBe('3 giờ trước');
    expect(timeAgo('2026-10-24T10:00:00+00', NOW)).toBe('hôm qua');
    expect(timeAgo('2026-10-20T12:00:00+00', NOW)).toBe('5 ngày trước');
  });
  it('không đọc được thì để trống (không giả "vừa xong")', () => {
    expect(timeAgo('', NOW)).toBe('');
    expect(timeAgo('abc', NOW)).toBe('');
    expect(timeAgo(null, NOW)).toBe('');
  });
});
