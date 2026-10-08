#!/usr/bin/env node
/**
 * Rasterize icon SVGs -> PNG cho PWA / favicon / Apple.
 *   node scripts/gen-icons.mjs            (cần: npm i -D sharp)
 *
 * Nguồn:
 *   icon.svg           — bản BO GÓC (any purpose): favicon trình duyệt + icon-192/512.
 *   icon-maskable.svg  — bản TRÀN VIỀN (maskable): nội dung co trong vùng an toàn 80%,
 *                        dùng cho icon maskable PWA + apple-touch (iOS tự bo góc).
 * Chỉ cần chạy lại khi đổi các file .svg.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, 'public', 'icons');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('Cần sharp: npm i -D sharp');
  process.exit(1);
}

const rounded = readFileSync(path.join(dir, 'icon.svg'));
const maskable = readFileSync(path.join(dir, 'icon-maskable.svg'));

const jobs = [
  // any purpose — bo góc, mặt lấp đầy
  { svg: rounded, size: 192, file: 'icon-192.png' },
  { svg: rounded, size: 512, file: 'icon-512.png' },
  // maskable — tràn viền, nội dung trong vùng an toàn
  { svg: maskable, size: 512, file: 'icon-maskable-512.png' },
  // apple-touch — phải ĐẶC (không trong suốt); iOS tự bo góc
  { svg: maskable, size: 180, file: 'apple-touch-icon.png', flatten: '#C23A5A' },
];

for (const j of jobs) {
  let img = sharp(j.svg, { density: 384 }).resize(j.size, j.size);
  if (j.flatten) img = img.flatten({ background: j.flatten });
  await img.png().toFile(path.join(dir, j.file));
  console.log(`  ✔ ${j.file} (${j.size}×${j.size})`);
}
