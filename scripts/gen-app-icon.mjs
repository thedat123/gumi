#!/usr/bin/env node
/**
 * Sinh icon app (PWA / favicon / Apple) TỪ ẢNH GỐC:
 *   public/icons/icon-source.png  — ảnh mascot Gumi trên nền hồng (đã crop vuông).
 *
 *   node scripts/gen-app-icon.mjs            (cần: npm i -D sharp)
 *
 * Xuất:
 *   icon-192.png / icon-512.png        — any purpose (bo góc)
 *   icon-maskable-512.png              — maskable (ảnh co nhẹ, kéo dài nền hồng tràn viền)
 *   apple-touch-icon.png (180)         — đặc (iOS tự bo góc)
 */
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, 'public', 'icons');
const src = path.join(dir, 'icon-source.png');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('Cần sharp: npm i -D sharp');
  process.exit(1);
}

const PINK = '#F1A6AE'; // màu nền pad cho maskable, khớp nền ảnh gốc

// mặt nạ bo góc cho icon any
function roundedMask(size, r) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`
  );
}

async function roundedIcon(size) {
  const r = Math.round(size * 0.22);
  const base = await sharp(src).resize(size, size, { fit: 'cover' }).png().toBuffer();
  return sharp(base)
    .composite([{ input: roundedMask(size, r), blend: 'dest-in' }])
    .png()
    .toBuffer();
}

// maskable: dùng CHÍNH ảnh gốc tràn viền (gradient liền mạch, không pad màu),
// con mèo co nhẹ vào ~90% để hệ điều hành bo/cắt không xén tai & chân.
async function maskableIcon(size) {
  const inner = Math.round(size * 0.9);
  const pad = Math.round((size - inner) / 2);
  const art = await sharp(src).resize(inner, inner, { fit: 'cover' }).png().toBuffer();
  // kéo giãn mép ảnh ra viền bằng cách nhân bản pixel mép -> nền hồng nối liền, không có đường gân
  return sharp(art)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, extendWith: 'copy' })
    .resize(size, size)
    .png()
    .toBuffer();
}

const r192 = await roundedIcon(192);
const r512 = await roundedIcon(512);
const mask = await maskableIcon(512);
const apple = await sharp(src).resize(180, 180, { fit: 'cover' }).flatten({ background: PINK }).png().toBuffer();

const writes = [
  ['icon-192.png', r192],
  ['icon-512.png', r512],
  ['icon-maskable-512.png', mask],
  ['apple-touch-icon.png', apple],
];
for (const [file, buf] of writes) {
  await sharp(buf).toFile(path.join(dir, file));
  console.log(`  ✔ ${file}`);
}

// Giữ các URL SVG cũ đồng bộ với cùng ảnh, tránh hiển thị lại mascot cũ.
for (const [file, buf] of [['icon.svg', r512], ['icon-maskable.svg', mask]]) {
  await writeFile(path.join(dir, file), `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${buf.toString('base64')}"/></svg>\n`);
}
