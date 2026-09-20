#!/usr/bin/env node
/**
 * Chụp ảnh prototype để duyệt nhanh (npm run shots):
 *   node scripts/capture.mjs                  # mọi màn × mọi trạng thái ở 390×844, ghi vào shots/
 *   node scripts/capture.mjs --sizes 390x844,360x640,768x1024,1280x800
 *   node scripts/capture.mjs --motion         # chụp "phim khung hình" chuyển động của Gumi (idle và sự kiện)
 *   node scripts/capture.mjs --list           # chỉ in danh sách sẽ chụp, không mở trình duyệt
 * Cần: npx playwright install chromium (một lần). Đặt BASE_URL nếu bạn đã chạy sẵn `npm run dev`.
 * Kết quả: shots/*.png và shots/index.html (trang ghép ảnh để xem một lượt).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };

const SCENARIOS = ['before_start', 'today_open', 'today_done', 'dying', 'missed_no_pass', 'rejected_day', 'finished', 'ended'];
const CHECKIN = ['interactive', 'photo_selected', 'uploading', 'success', 'error_network', 'not_today', 'already_done', 'level_not_allowed', 'photo_too_large_or_not_image'];
const BOARD = ['in_top10', 'outside_top10_with_gap', 'empty', 'loading', 'error'];

export function stillShots() {
  return [
    { name: 'styleguide', route: '/styleguide', full: true },
    { name: 'login', route: '/login' },
    { name: 'login-in-app-browser', route: '/login?inapp=1' },
    { name: 'onboarding', route: '/onboarding' },
    ...SCENARIOS.map((s) => ({ name: `dashboard-${s}`, route: `/?s=${s}`, full: true })),
    ...CHECKIN.map((m) => ({ name: `checkin-${m}`, route: `/mission/3?cmode=${m}` })),
    ...BOARD.map((m) => ({ name: `leaderboard-${m}`, route: `/leaderboard?s=today_open&lmode=${m}` })),
    { name: 'dashboard-reduced-motion', route: '/?s=finished&rm=1' },
  ];
}

export function motionShots() {
  const seq = (max, step) => Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  return [
    { name: 'idle-bo-pho-breathe', route: '/?s=today_open', times: seq(3600, 600) },
    { name: 'idle-hap-hoi-wobble', route: '/?s=dying', times: seq(2600, 400) },
    { name: 'idle-tien-hoa-hop', route: '/?s=finished', times: seq(1200, 150), noDelay: true },
    { name: 'event-cheer', route: '/?s=today_open&event=cheer', times: seq(1200, 150), waitClass: 'is-cheer' },
    { name: 'event-revive', route: '/?s=dying&event=revive', times: seq(1400, 200), waitClass: 'is-revive' },
    { name: 'event-evolve', route: '/?s=finished&event=evolve', times: seq(2000, 250), waitClass: 'is-evolve' },
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sizes = opt('sizes', '390x844').split(',').map((s) => s.split('x').map(Number));
  const still = stillShots();
  const motion = flag('motion') ? motionShots() : [];
  if (flag('list')) {
    console.log(`${still.length} ảnh tĩnh × ${sizes.length} kích thước; ${motion.length} chuỗi chuyển động`);
    for (const s of still) console.log(`  ${s.name}  →  /#${s.route}`);
    for (const m of motion) console.log(`  [motion] ${m.name}  →  /#${m.route}  (${m.times.length} khung)`);
    process.exit(0);
  }
  await run(sizes, still, motion);
}

async function waitFor(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(url)).ok) return; } catch { /* chưa lên */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Máy chủ dev không lên sau ${ms / 1000}s: ${url}`);
}

async function run(sizes, still, motion) {
  const { chromium } = await import('@playwright/test');
  let base = process.env.BASE_URL;
  let server;
  if (!base) {
    base = 'http://localhost:5199';
    server = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { stdio: 'ignore', shell: process.platform === 'win32' });
    await waitFor(base);
  }
  const out = path.resolve('shots');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const figures = [];
  const browser = await chromium.launch();
  try {
    for (const [w, h] of sizes) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
      const page = await ctx.newPage();
      for (const s of still) {
        await page.goto(`${base}/#${s.route}`);
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' }); // ảnh tĩnh: đóng băng để so sánh ổn định
        const file = `${s.name}@${w}x${h}.png`;
        await page.screenshot({ path: path.join(out, file), fullPage: !!s.full });
        figures.push({ file, caption: `${s.name} (${w}×${h})` });
        console.log(`  ✔ ${file}`);
      }
      await ctx.close();
    }
    if (motion.length) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      for (const m of motion) {
        await page.goto(`${base}/#${m.route}`);
        await page.evaluate(() => document.fonts.ready);
        if (m.noDelay) await page.addStyleTag({ content: '.gumi{--hop-delay:0s !important}' });
        if (m.waitClass) await page.waitForSelector(`.gumi.${m.waitClass}`, { timeout: 5000 });
        const mascot = page.locator('.gumi').first();
        for (const t of m.times) {
          await page.evaluate((time) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = time; }), t);
          const file = `motion-${m.name}-${String(t).padStart(4, '0')}ms.png`;
          await mascot.screenshot({ path: path.join(out, file) });
          figures.push({ file, caption: `${m.name} @ ${t}ms` });
        }
        console.log(`  ✔ chuyển động ${m.name}: ${m.times.length} khung`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    server?.kill();
  }
  const html = `<!doctype html><meta charset="utf-8"><title>Ảnh chụp prototype</title>
<style>body{font:14px system-ui;margin:16px;background:#f4f4f4}.g{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;background:#fff;padding:8px;border-radius:8px}img{max-width:240px;height:auto;display:block}figcaption{margin-top:4px;color:#555}</style>
<h1>Ảnh chụp prototype (${figures.length})</h1><div class="g">${figures.map((f) => `<figure><a href="${f.file}"><img src="${f.file}" loading="lazy"></a><figcaption>${f.caption}</figcaption></figure>`).join('')}</div>`;
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log(`\nMở ${path.join('shots', 'index.html')} để xem một lượt.`);
}
