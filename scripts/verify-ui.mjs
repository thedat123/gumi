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
async function shot(page, name) { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true }); log.push(`✓ ${name} — ${page.url()}`); }

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
  await p.goto(`${BASE}/me`, { waitUntil: 'networkidle' }); await shot(p, `${vp}-profile`);
  await p.goto(`${BASE}/leaderboard`, { waitUntil: 'networkidle' }); await shot(p, `${vp}-leaderboard`);
  await p.evaluate(SEED_DONE);
  await p.goto(`${BASE}/summary`, { waitUntil: 'networkidle' }); await shot(p, `${vp}-summary`);
  await cP.close();
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
