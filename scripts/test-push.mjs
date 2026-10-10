// Test FLOW NHẮC NHỞ trên bản BUILD (SW chỉ đăng ký ở production). Grant quyền noti, bấm "Bật nhắc nhở",
// bắt sự kiện service worker gọi showNotification, chụp lại trạng thái. Chạy sau khi đã `vite build` (mock).
//   VITE_DATA_SOURCE=mock npm run build && node scripts/test-push.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 5191, BASE = `http://127.0.0.1:${PORT}`;
const OUT = new URL('../verify-shots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], { env: { ...process.env, VITE_DATA_SOURCE: 'mock' }, stdio: 'ignore' });
const stop = () => { try { server.kill('SIGTERM'); } catch { /* */ } };
process.on('exit', stop);

async function ready() { for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) return; } catch { /* */ } await new Promise((r) => setTimeout(r, 500)); } throw new Error('preview không lên'); }

await ready();
// Chrome THẬT (không phải Chrome for Testing) + headed: mới có push service (FCM) để subscribe() chạy,
// và quyền thông báo mới grant được. Cần cài Google Chrome trên máy.
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['notifications'] });
await ctx.grantPermissions(['notifications'], { origin: BASE });
const page = await ctx.newPage();
const notes = [];
page.on('pageerror', (e) => notes.push(`JS error: ${e.message}`));
// Bắt noti mà service worker bắn ra (ghi đè showNotification trong trang để quan sát).
await page.addInitScript(() => {
  window.__notes = [];
  const orig = ServiceWorkerRegistration.prototype.showNotification;
  ServiceWorkerRegistration.prototype.showNotification = function (title, opts) { window.__notes.push({ title, body: opts?.body, icon: opts?.icon, badge: opts?.badge }); return orig.apply(this, arguments); };
});

// Đăng nhập test5
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'test5@gumi.vn');
await page.fill('input[type="password"]', 'test1234');
await page.click('button[type="submit"]');
await page.waitForTimeout(1500);

// Chờ service worker active (chỉ có ở bản build)
const swActive = await page.evaluate(async () => { try { await navigator.serviceWorker.ready; return true; } catch { return false; } });
notes.push(`service worker active: ${swActive}`);

await page.goto(`${BASE}/me`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const permState = await page.evaluate(() => Notification.permission);
notes.push(`Notification.permission = ${permState}`);
// Bấm "Bật nhắc nhở" (force để vượt trạng thái disabled nếu có, rồi xem logic chạy ra sao)
const btn = page.locator('button:has-text("Bật nhắc nhở")');
if (await btn.count()) { await btn.first().click({ force: true }).catch((e) => notes.push(`click lỗi: ${e.message.split('\n')[0]}`)); await page.waitForTimeout(3500); notes.push('đã bấm "Bật nhắc nhở"'); }
else notes.push('KHÔNG thấy nút "Bật nhắc nhở" (có thể đã ở trạng thái bật)');

const fired = await page.evaluate(() => window.__notes || []);
notes.push(`showNotification (qua nút, cần subscribe): ${JSON.stringify(fired)}`);

// Test TRỰC TIẾP đường HIỂN THỊ noti ra khay với TITLE + LOGO y như server push bắn ra.
const direct = await page.evaluate(async () => {
  try {
    const r = await navigator.serviceWorker.ready;
    await r.showNotification('Level Down Challenge', { body: 'Thử thách hôm nay đang chờ bạn 🐱', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'direct' });
    const list = await r.getNotifications();
    return { ok: true, shown: list.map((n) => ({ title: n.title, icon: n.icon })) };
  } catch (e) { return { ok: false, err: String(e) }; }
});
notes.push(`BẮN noti (title+logo): ${JSON.stringify(direct)}`);
notes.push(`Hook bắt được: ${JSON.stringify(await page.evaluate(() => window.__notes))}`);
// Logo có tải được không (200)?
const iconStatus = await page.evaluate(async () => { try { const r = await fetch('/icons/icon-192.png'); return r.status; } catch { return 0; } });
notes.push(`Logo /icons/icon-192.png → HTTP ${iconStatus}`);

// Test TRỰC TIẾP pushManager.subscribe để BẮT LỖI cụ thể.
const vapid = (fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/VITE_VAPID_PUBLIC_KEY=(.+)/) || [])[1]?.trim() || '';
const sub = await page.evaluate(async (key) => {
  const u = (b) => { const p = '='.repeat((4 - b.length % 4) % 4); const s = (b + p).replace(/-/g, '+').replace(/_/g, '/'); const r = atob(s); const a = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; };
  try { const reg = await navigator.serviceWorker.ready; const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u(key) }); return { ok: true, endpoint: s.endpoint.slice(0, 45) }; }
  catch (e) { return { ok: false, err: String(e) }; }
}, vapid);
notes.push(`subscribe TRỰC TIẾP: ${JSON.stringify(sub)}`);
await page.screenshot({ path: `${OUT}push-enabled.png`, fullPage: true });
notes.push('đã chụp push-enabled.png');

await browser.close();
console.log(notes.join('\n'));
stop();
