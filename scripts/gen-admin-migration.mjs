#!/usr/bin/env node
// Sinh migration seed danh sách email admin vào bảng public.admin_emails.
//
// Nguồn email (ưu tiên theo thứ tự):
//   1) Tham số dòng lệnh:  node scripts/gen-admin-migration.mjs a@x.com b@y.com
//   2) Biến VITE_ADMIN_EMAILS trong .env.local  (ngăn cách bằng dấu phẩy)
//
// Kết quả: tạo file supabase/migrations/<NNNN>_admin_seed.sql (chỉ INSERT ... ON CONFLICT DO NOTHING).
// Chạy áp dụng bằng: scripts/db-push.sh "<DATABASE_URL>"

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migDir = join(root, 'supabase', 'migrations');
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Đọc VITE_ADMIN_EMAILS từ .env.local nếu không truyền qua dòng lệnh. */
function fromEnvFile() {
  const p = join(root, '.env.local');
  if (!existsSync(p)) return [];
  const line = readFileSync(p, 'utf8').split(/\r?\n/).find((l) => l.trim().startsWith('VITE_ADMIN_EMAILS='));
  if (!line) return [];
  return line.slice(line.indexOf('=') + 1).split(',');
}

const raw = process.argv.slice(2).length ? process.argv.slice(2) : fromEnvFile();
// Chuẩn hoá thành MẢNG email: trim, bỏ trống, lowercase, loại trùng.
const emails = [...new Set(raw.map((e) => e.trim().toLowerCase()).filter(Boolean))];

if (emails.length === 0) {
  console.error('✗ Không tìm thấy email admin. Truyền qua tham số hoặc đặt VITE_ADMIN_EMAILS trong .env.local.');
  process.exit(1);
}

const invalid = emails.filter((e) => !emailRe.test(e));
if (invalid.length) {
  console.error(`✗ Email không hợp lệ: ${invalid.join(', ')}`);
  process.exit(1);
}

// Số thứ tự migration kế tiếp (4 chữ số) dựa trên các file hiện có.
const maxN = readdirSync(migDir)
  .map((f) => Number.parseInt(f.slice(0, 4), 10))
  .filter((n) => Number.isFinite(n))
  .reduce((a, b) => Math.max(a, b), 0);
const seq = String(maxN + 1).padStart(4, '0');
const file = join(migDir, `${seq}_admin_seed.sql`);

const values = emails.map((e) => `  ('${e.replace(/'/g, "''")}')`).join(',\n');
const sql = `-- ${seq} — Seed danh sách email admin (allowlist). Sinh tự động bởi scripts/gen-admin-migration.mjs.
-- An toàn khi chạy lại (idempotent): ON CONFLICT DO NOTHING.
insert into public.admin_emails (email) values
${values}
on conflict (email) do nothing;
`;

writeFileSync(file, sql);
console.log(`✓ Đã tạo ${file.replace(root + '/', '')} với ${emails.length} email admin:`);
emails.forEach((e) => console.log(`   • ${e}`));
console.log('\nÁp dụng: scripts/db-push.sh "<DATABASE_URL>"   (hoặc dán nội dung file vào SQL Editor trên Supabase)');
