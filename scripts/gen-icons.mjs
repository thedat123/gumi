#!/usr/bin/env node
/**
 * Rasterize public/icons/icon.svg -> PNG (192, 512, apple-touch 180).
 *   npm i -D @playwright/test && npx playwright install chromium
 *   node scripts/gen-icons.mjs
 * Chỉ cần chạy lại khi đổi icon.svg; các PNG đã có sẵn trong public/icons.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svg = readFileSync(path.join(root, 'public', 'icons', 'icon.svg'), 'utf8');

let chromium;
try {
  ({ chromium } = await import('@playwright/test'));
} catch {
  console.error('Cần Playwright: npm i -D @playwright/test && npx playwright install chromium');
  process.exit(1);
}

const OUT = path.join(root, 'public', 'icons');
const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch();
try {
  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
    const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}svg{display:block}</style>${svg.replace(/width="512"/, `width="${t.size}"`).replace(/height="512"/, `height="${t.size}"`)}`;
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.locator('svg').screenshot({ path: path.join(OUT, t.file), omitBackground: false });
    await page.close();
    console.log(`  ✔ ${t.file} (${t.size}×${t.size})`);
  }
} finally {
  await browser.close();
}
