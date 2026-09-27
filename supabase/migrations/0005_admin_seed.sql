-- 0005 — Seed danh sách email admin (allowlist). Sinh tự động bởi scripts/gen-admin-migration.mjs.
-- An toàn khi chạy lại (idempotent): ON CONFLICT DO NOTHING.
insert into public.admin_emails (email) values
  ('vothedatdavid@gmail.com')
on conflict (email) do nothing;
