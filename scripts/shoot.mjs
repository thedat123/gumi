import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const BASE = 'http://localhost:5188';
async function waitFor(url, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise((r) => setTimeout(r, 400)); } throw new Error('no preview'); }
const server = spawn('npx', ['vite', 'preview', '--port', '5188', '--strictPort'], { stdio: 'ignore' });
const out = path.resolve('shots'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
try {
  await waitFor(BASE);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  async function run(tag, w, h) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'vi-VN' });
    const page = await ctx.newPage();
    const shot = async (n) => { await page.screenshot({ path: path.join(out, `${tag}-${n}.png`) }); console.log('  ✔', tag, n); };
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill('sen@gumi.vn');
    await page.getByLabel('Mật khẩu').fill('gumi1234');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL('**/onboarding', { timeout: 8000 });
    await page.getByText('Hệ trung dung').click();
    await page.getByLabel('Tên hiển thị').fill('Sen Gumi');
    await page.getByRole('button', { name: 'Nhận nuôi Gumi' }).click();
    await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 8000 });
    await page.waitForTimeout(1400); await shot('room');
    await page.goto(`${BASE}/journey`); await page.waitForTimeout(1000); await shot('journey');
    await ctx.close();
  }
  await run('mobile', 390, 844);
  await run('desktop', 1440, 900);
  await browser.close(); console.log('done');
} finally { server.kill(); }
