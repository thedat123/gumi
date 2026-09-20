import { describe, expect, it } from 'vitest';
import { SCENARIOS, TOP10, checkedCount, gumiStateOf, scenarioById } from './scenarios';

describe('kịch bản giả', () => {
  it('có đúng 8 kịch bản khớp danh sách trạng thái dashboard bắt buộc', () => {
    expect(SCENARIOS.map((s) => s.id).sort()).toEqual(['before_start', 'dying', 'ended', 'finished', 'missed_no_pass', 'rejected_day', 'today_done', 'today_open']);
  });
  it('mỗi kịch bản có đủ 10 ngày và điểm không vượt tối đa 260', () => {
    for (const s of SCENARIOS) {
      expect(s.days).toHaveLength(10);
      expect(s.totalPoints).toBeLessThanOrEqual(260);
    }
  });
  it('quy tắc Gumi: hấp hối ưu tiên hơn tiến hoá, tiến hoá khi xong Day 10', () => {
    expect(gumiStateOf(scenarioById('dying'))).toBe('hap_hoi');
    expect(gumiStateOf(scenarioById('finished'))).toBe('tien_hoa');
    expect(gumiStateOf(scenarioById('today_open'))).toBe('bo_pho');
    expect(gumiStateOf({ ...scenarioById('finished'), days: ['dying', ...scenarioById('finished').days.slice(1)] })).toBe('hap_hoi');
  });
  it('kịch bản hấp hối có hạn Pass, kịch bản hết Pass thì không', () => {
    expect(scenarioById('dying').passHoursLeft).not.toBeNull();
    expect(scenarioById('missed_no_pass').passAvailable).toBe(false);
  });
  it('đếm số ngày đã xong không tính ngày dùng Pass', () => {
    expect(checkedCount(scenarioById('missed_no_pass'))).toBe(3);
  });
  it('id lạ rơi về kịch bản mặc định', () => {
    expect(scenarioById('khong-co').id).toBe('today_open');
  });
  it('Top 10 đủ 10 người, điểm giảm dần', () => {
    expect(TOP10).toHaveLength(10);
    for (let i = 1; i < TOP10.length; i++) expect(TOP10[i - 1]!.points).toBeGreaterThan(TOP10[i]!.points);
  });
});
