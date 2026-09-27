-- =====================================================================
-- Level Down Challenge — LƯỢC ĐỒ (schema) + RLS
-- Nguồn sự thật điểm số/trạng thái nằm ở SQL (bảng day_progress + RPC).
-- Khớp hợp đồng ở src/api/types.ts và adapter src/api/real.ts.
-- =====================================================================
create extension if not exists pgcrypto;

-- ---- Cấu hình chiến dịch (đúng MỘT dòng) ----------------------------
create table if not exists public.app_config (
  id          boolean primary key default true check (id),
  start_date  date    not null default current_date,
  total_days  int     not null default 21
);

-- ---- Hồ sơ người chơi (1–1 với auth.users) --------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null,
  avatar          text not null default '🐱',
  level           int  not null default 100 check (level in (0,30,50,70,100)),
  drinks_per_week int  not null default 7   check (drinks_per_week between 0 and 100),
  role            text not null default 'player' check (role in ('player','admin')),
  passes_left     int  not null default 3   check (passes_left between 0 and 3),
  created_at      timestamptz not null default now()
);

-- ---- Danh mục 21 nhiệm vụ (seed ở 0003) -----------------------------
create table if not exists public.missions (
  day         int primary key check (day between 1 and 21),
  kind        text not null check (kind in ('DRINK','KNOW','SHARE','FINAL','GAME')),
  title       text not null,
  description text not null default '',
  points      numeric not null default 0,
  needs_level boolean not null default false  -- ngày DRINK có chọn mức đường (1,5,15,20)
);

-- ---- Câu hỏi quiz Ngày 2 (seed ở 0003) ------------------------------
create table if not exists public.quiz_questions (
  id     int primary key,
  drink  text not null,
  answer numeric not null,
  min    numeric not null default 0,
  max    numeric not null default 20
);

-- ---- Tiến trình từng ngày: NGUỒN SỰ THẬT trạng thái + điểm ----------
create table if not exists public.day_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        int  not null check (day between 1 and 21),
  status     text not null check (status in ('checked','passed','rejected')),
  points     numeric not null default 0,          -- điểm ĐÃ chốt cho ngày đó (passed = 0)
  level      int check (level in (0,30,50,70,100)),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ---- Ảnh check-in (audit cho admin duyệt) ---------------------------
create table if not exists public.checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        int  not null check (day between 1 and 21),
  path       text not null,                        -- đường dẫn trong bucket 'checkins'
  status     text not null default 'approved' check (status in ('approved','rejected','pending')),
  reason     text,
  flag       text,                                 -- cờ nghi ngờ gian lận (admin_list_flags)
  created_at timestamptz not null default now()
);
create index if not exists checkins_day_idx  on public.checkins(day);
create index if not exists checkins_user_idx on public.checkins(user_id);

-- ---- Kết quả quiz Ngày 2 -------------------------------------------
create table if not exists public.quiz_results (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  score      numeric not null,
  max        numeric not null,
  items      jsonb   not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---- Tường chia sẻ -------------------------------------------------
create table if not exists public.wall_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  name       text not null,
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists wall_posts_created_idx on public.wall_posts(created_at desc);

-- ---- Đối thủ demo cho bảng xếp hạng (seed ở 0003) ------------------
create table if not exists public.leaderboard_seed (
  rank   int primary key,
  name   text not null,
  avatar text not null,
  points numeric not null
);

-- =====================================================================
-- RLS — bật cho mọi bảng; ghi dữ liệu người chơi CHỈ qua RPC (security definer)
-- =====================================================================
alter table public.app_config       enable row level security;
alter table public.profiles         enable row level security;
alter table public.missions         enable row level security;
alter table public.quiz_questions   enable row level security;
alter table public.day_progress     enable row level security;
alter table public.checkins         enable row level security;
alter table public.quiz_results     enable row level security;
alter table public.wall_posts       enable row level security;
alter table public.leaderboard_seed enable row level security;

-- Danh mục công khai (đọc) --------------------------------------------
drop policy if exists cfg_read     on public.app_config;
drop policy if exists mission_read on public.missions;
drop policy if exists quiz_read    on public.quiz_questions;
drop policy if exists lb_read      on public.leaderboard_seed;
create policy cfg_read     on public.app_config       for select using (true);
create policy mission_read on public.missions         for select using (true);
create policy quiz_read    on public.quiz_questions   for select using (true);
create policy lb_read      on public.leaderboard_seed for select using (true);

-- Dữ liệu cá nhân (đọc của chính mình) --------------------------------
drop policy if exists prof_read on public.profiles;
drop policy if exists prof_ins  on public.profiles;
drop policy if exists prof_upd  on public.profiles;
create policy prof_read on public.profiles for select using (id = auth.uid());
create policy prof_ins  on public.profiles for insert with check (id = auth.uid());
create policy prof_upd  on public.profiles for update using (id = auth.uid());

drop policy if exists dp_read on public.day_progress;
drop policy if exists ck_read on public.checkins;
drop policy if exists qr_read on public.quiz_results;
create policy dp_read on public.day_progress for select using (user_id = auth.uid());
create policy ck_read on public.checkins     for select using (user_id = auth.uid());
create policy qr_read on public.quiz_results for select using (user_id = auth.uid());

-- Tường công khai cho người đã đăng nhập -------------------------------
drop policy if exists wall_read on public.wall_posts;
create policy wall_read on public.wall_posts for select to authenticated using (true);

-- Quyền bảng (RLS vẫn lọc theo dòng) ----------------------------------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
