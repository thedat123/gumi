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

  it('check-in chặng 1 cộng điểm; qua ngày mới mới mở chặng 2', async () => {
    const api = await ready();
    const r = await api.submitCheckin(1, 70, 'ly.jpg');
    expect(r.points).toBe(15);
    // Cùng ngày: chặng 1 đã xong, chặng 2 CHƯA mở (khoá tới mai) — con trỏ ở chặng vừa xong.
    let j = await api.getJourney();
    expect(j.days[0]).toBe('checked');
    expect(j.days[1]).toBe('future');
    expect(j.totalPoints).toBe(15);
    // Sang ngày mới → chặng 2 mở.
    advanceMockDay();
    j = await api.getJourney();
    expect(j.day).toBe(2);
    expect(j.days[1]).toBe('open');
  });

  it('mỗi ngày chỉ một chặng: xong rồi nộp tiếp trong ngày báo not_today', async () => {
    const api = await ready();
    await api.submitCheckin(1, 70, 'a.jpg');
    // Chặng kế (2) chưa mở trong hôm nay → nộp bị chặn.
    await expect(api.submitQuiz({ 0: 13 })).rejects.toMatchObject({ code: 'not_today' } as ApiError);
    advanceMockDay();
    const res = await api.submitQuiz({ 0: 13 }); // sang ngày mới mới làm được chặng 2
    expect(res.score).toBe(res.max);
  });

  it('check-in sai chặng báo not_today; thiếu ảnh báo photo_invalid', async () => {
    const api = await ready();
    await expect(api.submitCheckin(3, 70, 'x.jpg')).rejects.toMatchObject({ code: 'not_today' } as ApiError);
    await expect(api.submitCheckin(1, 70, '')).rejects.toMatchObject({ code: 'photo_invalid' } as ApiError);
  });

  it('quiz chặng 2 chấm điểm; qua ngày mới mở chặng 3', async () => {
    const api = await ready();
    await api.submitCheckin(1, 70, 'a.jpg');
    advanceMockDay();
    const res = await api.submitQuiz({ 0: 13 }); // đoán trúng khoảng 12–15
    expect(res.score).toBe(res.max);
    advanceMockDay();
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
      if (d === 2) await api.submitQuiz({ 0: 10, 1: 12, 2: 6, 3: 9, 4: 5 });
      else if (minigameDays.includes(d)) await api.submitMinigame(d);
      else if (d === 21) await api.submitWallPost('Mình thấy khoẻ hơn nhiều sau 21 ngày.');
      else await api.submitCheckin(d, 30, `d${d}.jpg`);
    }
    const j = await api.getJourney();
    expect(j.gumi).toBe('tien_hoa');
    expect(j.days[20]).toBe('checked');
    const sum = await api.getSummary();
    expect(sum.eligible).toBe(true);
    expect(sum.streak).toBe(21);
    expect(sum.healthyCount).toBe(5); // 5 ngày DRINK
  });

  it('Sugar Pass bỏ qua chặng đang mở: giữ chuỗi; có 3 Bùa, dùng hết mới khoá', async () => {
    const api = await ready();
    await api.submitCheckin(1, 70, 'a.jpg'); // xong chặng 1
    advanceMockDay();
    await api.useSugarPass(); // bỏ qua chặng 2 (còn 2 Bùa)
    let j = await api.getJourney();
    expect(j.days[1]).toBe('passed');
    expect(j.passAvailable).toBe(true); // vẫn còn Bùa
    advanceMockDay();
    await api.useSugarPass(); // chặng 3 (còn 1)
    advanceMockDay();
    await api.useSugarPass(); // chặng 4 (còn 0)
    j = await api.getJourney();
    expect(j.passAvailable).toBe(false);
    advanceMockDay();
    await expect(api.useSugarPass()).rejects.toMatchObject({ code: 'no_pass' } as ApiError);
  });
});
