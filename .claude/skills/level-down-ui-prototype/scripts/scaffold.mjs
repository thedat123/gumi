#!/usr/bin/env node
/**
 * Sao chép khung prototype vào thư mục đích.
 *   node scaffold.mjs prototype [--force]
 * Không sao chép node_modules, dist, shots. Từ chối ghi vào thư mục đã có nội dung nếu thiếu --force.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'template');
const args = process.argv.slice(2);
const force = args.includes('--force');
const target = path.resolve(args.find((a) => !a.startsWith('--')) || 'prototype');
const SKIP = new Set(['node_modules', 'dist', 'shots', 'test-results']);

if (fs.existsSync(target) && fs.readdirSync(target).length > 0 && !force) {
  console.error(`Thư mục ${path.relative(process.cwd(), target) || '.'} đã có nội dung. Dùng --force để ghi đè (các tệp cùng tên sẽ bị thay).`);
  process.exit(1);
}
fs.mkdirSync(target, { recursive: true });
fs.cpSync(TEMPLATE, target, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });

const rel = path.relative(process.cwd(), target) || '.';
console.log(`Đã dựng khung prototype tại ${rel}/`);
console.log(`\nBước tiếp theo:\n  cd ${rel}\n  npm install\n  npm run dev -- --host     # mở trên điện thoại cùng wifi bằng địa chỉ "Network" mà Vite in ra\n  npm run check             # typecheck + test + kiểm tra chuyển động + build\n  npx playwright install chromium && npm run shots   # ảnh chụp để duyệt (cần tải Chromium)`);
