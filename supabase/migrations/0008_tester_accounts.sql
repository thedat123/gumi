-- =====================================================================
-- 0008 — Seed tài khoản DEMO/QA (mở khoá mọi màn nhờ is_tester = true ở 0007).
--   • 5 tester:  test1..test5@gumi.vn   (mật khẩu: test1234)
--   • 1 admin:   admin@gumi.vn           (mật khẩu: test1234)  → role=admin + is_tester
-- Seed TRỰC TIẾP vào auth.users + auth.identities + public.profiles.
-- Idempotent: chạy lại vẫn an toàn (ON CONFLICT). Đổi mật khẩu sau ở dashboard Auth nếu cần.
-- =====================================================================

-- ---- auth.users -----------------------------------------------------
with accts(id, email, name, avatar, is_admin) as (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'test1@gumi.vn', 'Người Test 1', '🐱', false),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'test2@gumi.vn', 'Người Test 2', '🐰', false),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'test3@gumi.vn', 'Người Test 3', '🐻', false),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'test4@gumi.vn', 'Người Test 4', '🐼', false),
    ('55555555-5555-5555-5555-555555555555'::uuid, 'test5@gumi.vn', 'Người Test 5', '🐨', false),
    ('aaaaaaaa-0000-0000-0000-0000000000ad'::uuid, 'admin@gumi.vn', 'Admin Test',   '🦊', true)
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email,
  crypt('test1234', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', a.name),
  now(), now(), '', '', '', ''
from accts a
on conflict (id) do nothing;

-- ---- auth.identities (đăng nhập bằng email/mật khẩu) ----------------
with accts(id, email) as (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'test1@gumi.vn'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'test2@gumi.vn'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'test3@gumi.vn'),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'test4@gumi.vn'),
    ('55555555-5555-5555-5555-555555555555'::uuid, 'test5@gumi.vn'),
    ('aaaaaaaa-0000-0000-0000-0000000000ad'::uuid, 'admin@gumi.vn')
)
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), a.id::text, a.id,
  jsonb_build_object('sub', a.id::text, 'email', a.email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from accts a
on conflict do nothing;

-- ---- public.profiles (bỏ onboarding + is_tester = mở mọi màn) -------
with accts(id, name, avatar, is_admin) as (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Người Test 1', '🐱', false),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'Người Test 2', '🐰', false),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Người Test 3', '🐻', false),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'Người Test 4', '🐼', false),
    ('55555555-5555-5555-5555-555555555555'::uuid, 'Người Test 5', '🐨', false),
    ('aaaaaaaa-0000-0000-0000-0000000000ad'::uuid, 'Admin Test',   '🦊', true)
)
insert into public.profiles (id, name, avatar, level, drinks_per_week, role, passes_left, is_tester)
select a.id, a.name, a.avatar, 100, 7,
       case when a.is_admin then 'admin' else 'player' end, 3, true
from accts a
on conflict (id) do update
  set name = excluded.name, avatar = excluded.avatar, role = excluded.role, is_tester = true;

-- ---- Allowlist admin cho tài khoản admin demo ----------------------
insert into public.admin_emails (email) values ('admin@gumi.vn')
on conflict (email) do nothing;
