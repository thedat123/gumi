import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from './types';
import { advanceMockDay, createMockApi, resetMock } from './mock';

// localStorage giả tối giản để chạy ở môi trường 'node' — KHÔNG cần jsdom (jsdom kéo undici gây lỗi
// "markAsUncloneable is not a function" trên Node của CI). Nhờ vậy CI chạy ổn trên mọi phiên bản Node.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const mem: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    key: (i) => [...store.keys()][i] ?? null,
  };
  globalThis.localStorage = mem;
}

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

  it('check-in chặng 1 cộng điểm và mở ngay chặng 2', async () => {
    const api = await ready();
    const r = await api.submitCheckin(1, 70, 'ly.jpg');
    expect(r.points).toBe(15);
    const j = await api.getJourney();
    expect(j.days[0]).toBe('checked');
    expect(j.days[1]).toBe('open');
    expect(j.totalPoints).toBe(15);
    expect(j.day).toBe(2);
  });

  it('chỉ mở tuần tự: xong chặng trước mới nộp được chặng kế', async () => {
    const api = await ready();
    await expect(api.submitQuiz({ 0: 13 })).rejects.toMatchObject({ code: 'not_today' } as ApiError);
    await api.submitCheckin(1, 70, 'a.jpg');
    const res = await api.submitQuiz({ 0: 13 });
    expect(res.score).toBe(res.max);
  });

  it('check-in sai chặng báo not_today; thiếu ảnh báo photo_invalid', async () => {
    const api = await ready();
    await expect(api.submitCheckin(3, 70, 'x.jpg')).rejects.toMatchObject({ code: 'not_today' } as ApiError);
    await expect(api.submitCheckin(1, 70, '')).rejects.toMatchObject({ code: 'photo_invalid' } as ApiError);
  });

  it('không nhận check-in vượt mức đường của ngày 1', async () => {
    const api = await ready();
    await expect(api.submitCheckin(1, 100, 'ly.jpg')).rejects.toMatchObject({ code: 'level_not_allowed' } as ApiError);
    expect((await api.getJourney()).days[0]).toBe('open');
  });

  it('quiz chặng 2 chấm điểm và mở ngay chặng 3', async () => {
    const api = await ready();
    await api.submitCheckin(1, 70, 'a.jpg');
    const res = await api.submitQuiz({ 0: 13 }); // đoán trúng khoảng 12–15
    expect(res.score).toBe(res.max);
    const j = await api.getJourney();
    expect(j.day).toBe(3);
    expect(j.days[2]).toBe('open');
  });

  it('yêu cầu đăng nhập cho các API riêng tư', async () => {
    resetMock();
    const api = createMockApi();
    await expect(api.getJourney()).rejects.toMatchObject({ code: 'forbidden' } as ApiError);
  });

  it('chơi hết 21 chặng (mỗi ngày một chặng) → Gumi tiến hoá, summary đủ điều kiện', async () => {
    const api = await ready();
    const minigameDays = [3, 6, 7, 9, 11, 12, 14, 16, 17, 18, 19];
    for (let d = 1; d <= 21; d++) {
      if (d > 1) advanceMockDay(); // mỗi chặng là một ngày mới
      await api.markPlayed(); // bắt đầu chơi hôm nay → nuôi streak
      if (d === 2) await api.submitQuiz({ 0: 10, 1: 12, 2: 6, 3: 9, 4: 5 });
      else if (minigameDays.includes(d)) await api.submitMinigame(d);
      else if (d === 21) await api.submitWallPost('Mình thấy khoẻ hơn nhiều sau 21 ngày.');
      else await api.submitCheckin(d, d === 20 ? 0 : 30, `d${d}.jpg`);
    }
    const j = await api.getJourney();
    expect(j.gumi).toBe('tien_hoa');
    expect(j.days[20]).toBe('checked');
    const sum = await api.getSummary();
    expect(sum.eligible).toBe(true);
    expect(sum.streak).toBe(21);
    expect(sum.healthyCount).toBe(5); // 5 ngày DRINK
  });

  it('Bùa CHỈ cứu chuỗi (không bỏ qua chặng): lỡ 1 ngày → hấp hối → nối lại streak', async () => {
    const api = await ready();
    await api.markPlayed();               // ngày 0: streak 1
    advanceMockDay(); advanceMockDay();    // nhảy tới ngày 2 (lỡ ngày 1)
    let j = await api.getJourney();
    expect(j.streak).toBe(1);              // HẤP HỐI: chưa đứt, vẫn hiện
    expect(j.gumi).toBe('hap_hoi');        // Gumi mặt X_X
    expect(j.streakFreezeAvailable).toBe(true);
    expect(j.streakAtRisk).toBe(1);
    expect(await api.useStreakFreeze()).toBe(1);
    j = await api.getJourney();
    expect(j.days.filter((s) => s === 'passed')).toHaveLength(0); // KHÔNG có chặng bị "bỏ qua"
    await api.markPlayed();                // chơi hôm nay → tiếp tục chuỗi
    j = await api.getJourney();
    expect(j.streak).toBe(2);
    expect(j.passesLeft).toBe(2);          // đã tiêu 1 Bùa
    expect(j.streakFreezeAvailable).toBe(false);
  });

  it('lỡ 1 ngày mà KHÔNG cứu bằng Bùa → chơi lại là mất chuỗi (về 1)', async () => {
    const api = await ready();
    await api.markPlayed();                 // ngày 0: streak 1
    advanceMockDay(); await api.markPlayed(); // ngày 1: streak 2
    advanceMockDay(); advanceMockDay();      // tới ngày 3 (lỡ ngày 2), không dùng Bùa
    expect(await api.markPlayed()).toBe(1);  // không chơi liên tục → mất chuỗi, về 1
  });

  it('lỡ ≥2 ngày → streak về 0, không cứu được', async () => {
    const api = await ready();
    await api.markPlayed();
    advanceMockDay(); advanceMockDay(); advanceMockDay(); // lỡ 2 ngày
    const j = await api.getJourney();
    expect(j.streak).toBe(0);
    expect(j.streakFreezeAvailable).toBe(false);
    await expect(api.useStreakFreeze()).rejects.toMatchObject({ code: 'not_today' } as ApiError);
  });
});
