#!/usr/bin/env node
// Đóng dấu VERSION mới vào dist/sw.js sau mỗi build để service worker tự làm mới cache
// (người đã "Cài app" PWA nhận bản mới sạch, không kẹt bản cũ).
// Dùng git SHA khi có (CI), ngược lại dùng mốc thời gian.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const swPath = join(root, 'dist', 'sw.js');
if (!existsSync(swPath)) {
  console.error('✗ Chưa có dist/sw.js — chạy `npm run build` trước.');
  process.exit(1);
}

let stamp = process.env.GITHUB_SHA?.slice(0, 7);
if (!stamp) {
  try { stamp = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch { /* not a git repo */ }
}
if (!stamp) stamp = Date.now().toString(36);

const version = `ld-${stamp}`;
const src = readFileSync(swPath, 'utf8');
const out = src.replace(/const VERSION = ['"].*?['"];/, `const VERSION = '${version}';`);
if (out === src) console.warn('⚠ Không tìm thấy dòng VERSION trong sw.js (bỏ qua).');
writeFileSync(swPath, out);
console.log(`✓ sw.js VERSION = ${version}`);
