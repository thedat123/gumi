// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from './types';
import { createMockApi, resetMock } from './mock';

beforeEach(() => resetMock());

async function ready() {
  const api = createMockApi();
  await api.auth.signUp('sen@gumi.vn', 'gumi1234');
  await api.createProfile({ name: 'Sen', avatar: '🐱', level: 100, drinksPerWeek: 7 });
  return api;
}

describe('mock API — luồng chơi', () => {
  it('đăng ký rồi tạo hồ sơ; ngày 1 mở, chưa có điểm', async () => {
    const api = await ready();
    const j = await api.getJourney();
    expect(j.day).toBe(1);
    expect(j.days[0]).toBe('open');
    expect(j.totalPoints).toBe(0);
    expect(j.gumi).toBe('bo_pho');
  });

  it('check-in Day 1 cộng điểm và sang Day 2', async () => {
    const api = await ready();
    const r = await api.submitCheckin(1, 70, 'ly.jpg');
    expect(r.points).toBe(15);
    const j = await api.getJourney();
    expect(j.day).toBe(2);
    expect(j.days[0]).toBe('checked');
    expect(j.totalPoints).toBe(15);
  });

  it('check-in sai ngày báo not_today; thiếu ảnh báo photo_invalid', async () => {
    const api = await ready();
    await expect(api.submitCheckin(3, 70, 'x.jpg')).rejects.toMatchObject({ code: 'not_today' } as ApiError);
    await expect(api.submitCheckin(1, 70, '')).rejects.toMatchObject({ code: 'photo_invalid' } as ApiError);
  });

  it('quiz Day 2 chấm điểm và sang ngày kế', async () => {
    const api = await ready();
    await api.submitCheckin(1, 70, 'a.jpg');
    const res = await api.submitQuiz({ 0: 10, 1: 12, 2: 6, 3: 9, 4: 5 }); // đoán trúng hết
    expect(res.score).toBe(res.max);
    const j = await api.getJourney();
    expect(j.day).toBe(3);
  });

  it('yêu cầu đăng nhập cho các API riêng tư', async () => {
    resetMock();
    const api = createMockApi();
    await expect(api.getJourney()).rejects.toMatchObject({ code: 'forbidden' } as ApiError);
  });

  it('chơi hết 10 ngày → Gumi tiến hoá, summary đủ điều kiện', async () => {
    const api = await ready();
    for (let d = 1; d <= 10; d++) {
      if (d === 2) await api.submitQuiz({ 0: 10, 1: 12, 2: 6, 3: 9, 4: 5 });
      else if (d === 4 || d === 7) await api.submitMinigame(d);
      else if (d === 10) await api.submitWallPost('Mình thấy khoẻ hơn nhiều sau 10 ngày.');
      else await api.submitCheckin(d, 30, `d${d}.jpg`);
    }
    const j = await api.getJourney();
    expect(j.gumi).toBe('tien_hoa');
    expect(j.days[9]).toBe('checked');
    const sum = await api.getSummary();
    expect(sum.eligible).toBe(true);
    expect(sum.streak).toBe(10);
    expect(sum.healthyCount).toBe(4); // 4 ngày DRINK
  });

  it('Sugar Pass cứu ngày hôm nay: giữ chuỗi, hết pass', async () => {
    const api = await ready();
    await api.submitCheckin(1, 70, 'a.jpg'); // xong ngày 1, sang ngày 2
    await api.useSugarPass(); // bỏ qua ngày 2 bằng pass
    const j = await api.getJourney();
    expect(j.days[1]).toBe('passed');
    expect(j.passAvailable).toBe(false);
    expect(j.day).toBe(3);
  });
});
