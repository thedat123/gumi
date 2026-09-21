import { describe, expect, it } from 'vitest';
import { SCENARIOS, TOP10, TOTAL_DAYS, MAX_POINTS, actOfDay, checkedCount, gumiStateOf, isBossDay, progressOf, scenarioById } from './scenarios';

describe('kịch bản giả', () => {
  it('có đúng 8 kịch bản khớp danh sách trạng thái bản đồ bắt buộc', () => {
    expect(SCENARIOS.map((s) => s.id).sort()).toEqual(['before_start', 'dying', 'ended', 'finished', 'missed_no_pass', 'rejected_day', 'today_done', 'today_open']);
  });
  it('mỗi kịch bản có đủ 21 ngày và điểm không vượt tối đa', () => {
    for (const s of SCENARIOS) {
      expect(s.days).toHaveLength(TOTAL_DAYS);
      expect(s.totalPoints).toBeLessThanOrEqual(MAX_POINTS);
    }
  });
  it('quy tắc Gumi: bị quật ngã ưu tiên hơn tiến hoá, tiến hoá khi xong Day 21', () => {
    expect(gumiStateOf(scenarioById('dying'))).toBe('hap_hoi');
    expect(gumiStateOf(scenarioById('finished'))).toBe('tien_hoa');
    expect(gumiStateOf(scenarioById('today_open'))).toBe('bo_pho');
    expect(gumiStateOf({ ...scenarioById('finished'), days: ['dying', ...scenarioById('finished').days.slice(1)] })).toBe('hap_hoi');
  });
  it('kịch bản bị quật ngã có hạn Bùa, kịch bản hết Bùa thì không', () => {
    expect(scenarioById('dying').passHoursLeft).not.toBeNull();
    expect(scenarioById('missed_no_pass').passAvailable).toBe(false);
  });
  it('đếm số ngày đã xong không tính ngày dùng Bùa', () => {
    expect(checkedCount(scenarioById('missed_no_pass'))).toBe(3);
  });
  it('tiến độ = số ngày đã xong / 21', () => {
    expect(progressOf(scenarioById('finished'))).toBe(1);
    expect(progressOf(scenarioById('before_start'))).toBe(0);
    expect(progressOf(scenarioById('today_open'))).toBeCloseTo(3 / 21, 5);
  });
  it('vùng đất và cửa ải chia đúng: 1–7, 8–14, 15–21; cửa ải ở 7/14/21', () => {
    expect([actOfDay(1), actOfDay(7), actOfDay(8), actOfDay(14), actOfDay(15), actOfDay(21)]).toEqual([1, 1, 2, 2, 3, 3]);
    expect([7, 14, 21].every(isBossDay)).toBe(true);
    expect([1, 6, 8, 15, 20].some(isBossDay)).toBe(false);
  });
  it('id lạ rơi về kịch bản mặc định', () => {
    expect(scenarioById('khong-co').id).toBe('today_open');
  });
  it('Top 10 đủ 10 người, điểm giảm dần', () => {
    expect(TOP10).toHaveLength(10);
    for (let i = 1; i < TOP10.length; i++) expect(TOP10[i - 1]!.points).toBeGreaterThan(TOP10[i]!.points);
  });
});
