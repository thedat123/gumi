// Luồng TESTER tự động: bật dev server bằng DỮ LIỆU GIẢ (mock), đăng nhập sẵn các tài khoản test,
// rồi dùng Playwright chụp màn ở bề rộng DESKTOP + MOBILE để soi UI có vỡ không TRƯỚC khi ship.
//
//   npm run verify:ui
//
// Ảnh lưu ở ./verify-shots/ (đã .gitignore). Cần: `npx playwright install chromium` (chỉ 1 lần).
// Tài khoản mock: player test5@gumi.vn · admin admin@gumi.vn — mật khẩu test1234 (xem src/api/mock.ts).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 5190;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = new URL('../verify-shots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

// Các viewport cần soi: desktop rộng + điện thoại.
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const server = spawn('npx', ['vite', '--port', String(PORT), '--host', '127.0.0.1'], {
  env: { ...process.env, VITE_DATA_SOURCE: 'mock' }, stdio: 'ignore',
});
const stop = () => { try { server.kill('SIGTERM'); } catch { /* đã tắt */ } };
process.on('exit', stop); process.on('SIGINT', () => { stop(); process.exit(1); });

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* chưa lên */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Dev server mock không lên được');
}

const log = [];
async function login(page, email, pass) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await Promise.all([page.waitForLoadState('networkidle'), page.click('button[type="submit"]')]);
  await page.waitForTimeout(1200);
}
async function shot(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  // Chờ spinner "Đang tải…" (lazy chunk / guard async / warm model) biến mất rồi mới chụp.
  await page.locator('text=Đang tải').first().waitFor({ state: 'hidden', timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
  log.push(`✓ ${name} — ${page.url()}`);
}

// Seed 1 hồ sơ "đã tốt nghiệp" để xem được màn Tổng kết.
const SEED_DONE = () => {
  const KEY = 'ld_mock_v3'; const s = JSON.parse(localStorage.getItem(KEY) || '{}');
  s.completed = Array.from({ length: 21 }, (_, i) => i + 1); s.levels = { 1: 70, 5: 50, 15: 30, 20: 0 };
  s.quiz = { score: 5, max: 5 }; s.playStreak = 21; s.campaignDay = 21;
  const t = new Date().toISOString().slice(0, 10); s.lastDoneDate = t; s.lastPlayDate = t;
  s.earnedPoints = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i + 1, 20]));
  localStorage.setItem(KEY, JSON.stringify(s));
};

await waitReady();
const browser = await chromium.launch();
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  // Player
  const cP = await browser.newContext({ viewport: size });
  const p = await cP.newPage();
  p.on('pageerror', (e) => log.push(`✗ [${vp}] player JS error: ${e.message}`));
  await login(p, 'test5@gumi.vn', 'test1234');
  // Tài khoản test được mở hết chặng → đi qua mọi loại màn.
  const SCREENS = [
    ['home', '/'], ['journey', '/journey'], ['chapter1', '/chapter/1'],
    ['mission1-drink', '/mission/1'], ['mission2-quiz', '/mission/2'], ['mission3-game', '/mission/3'],
    ['mission4-share', '/mission/4'], ['mission19-spin', '/mission/19'], ['mission21-final', '/mission/21'],
    ['profile', '/me'], ['leaderboard', '/leaderboard'],
  ];
  for (const [name, path] of SCREENS) {
    await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }).catch(() => {});
    await shot(p, `${vp}-${name}`);
  }
  // Chuông thông báo: badge chưa đọc + mở dropdown.
  await p.goto(`${BASE}/journey`, { waitUntil: 'networkidle' });
  const bell = p.locator('button[aria-label^="Thông báo"]');
  if (await bell.count()) {
    await bell.first().click().catch(() => {});
    await p.waitForTimeout(600);
    await shot(p, `${vp}-bell-open`);
    log.push(`✓ [${vp}] chuông mở được`);
  } else log.push(`✗ [${vp}] KHÔNG thấy chuông thông báo`);
  await p.evaluate(SEED_DONE);
  await p.goto(`${BASE}/summary`, { waitUntil: 'networkidle' }); await shot(p, `${vp}-summary`);
  await cP.close();

  // Onboarding (tài khoản MỚI chưa có hồ sơ)
  const cN = await browser.newContext({ viewport: size });
  const n = await cN.newPage();
  n.on('pageerror', (e) => log.push(`✗ [${vp}] onboarding JS error: ${e.message}`));
  await n.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });
  await shot(n, `${vp}-signup`);
  await n.fill('input[type="email"]', `new_${vp}_${Date.now()}@gumi.vn`);
  await n.locator('input[type="password"]').first().fill('gumi12345');
  const pwds = n.locator('input[type="password"]'); if (await pwds.count() > 1) await pwds.nth(1).fill('gumi12345');
  await n.click('button[type="submit"]').catch(() => {});
  await n.waitForTimeout(1500);
  await shot(n, `${vp}-onboarding`);
  await cN.close();
  // Admin
  const cA = await browser.newContext({ viewport: size });
  const a = await cA.newPage();
  a.on('pageerror', (e) => log.push(`✗ [${vp}] admin JS error: ${e.message}`));
  await login(a, 'admin@gumi.vn', 'test1234');
  log.push(a.url().endsWith('/admin') ? `✓ [${vp}] admin → /admin (ẩn màn chơi)` : `✗ [${vp}] admin KHÔNG vào /admin: ${a.url()}`);
  await shot(a, `${vp}-admin-dashboard`);
  // Nút "Duyệt ảnh" có ở CẢ sidebar (desktop) lẫn thanh tab (mobile) → chọn cái ĐANG HIỆN.
  try { await a.locator('button:has-text("Duyệt ảnh"):visible').first().click({ timeout: 4000 }); await a.waitForTimeout(700); await shot(a, `${vp}-admin-review`); } catch { log.push(`✗ [${vp}] không mở được tab Duyệt ảnh`); }
  await a.goto(`${BASE}/journey`, { waitUntil: 'networkidle' }); await a.waitForTimeout(600);
  log.push(a.url().endsWith('/admin') ? `✓ [${vp}] admin vào /journey bị chặn → /admin` : `✗ [${vp}] admin vào được /journey: ${a.url()}`);
  await cA.close();
}
await browser.close();
fs.writeFileSync(`${OUT}log.txt`, log.join('\n'));
console.log(log.join('\n'));
console.log(`\nẢnh: ${OUT}`);
stop();
