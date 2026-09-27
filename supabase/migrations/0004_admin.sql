-- 0004 — Quyền admin theo ALLOWLIST + thống kê cho màn quản trị.
-- Trước đây admin được cấp cho MỌI email bắt đầu bằng 'admin' (dễ tự phong). Nay chỉ các email
-- nằm trong bảng public.admin_emails mới là admin → "đúng tài khoản mới vào /admin".

-- ---- Danh sách email admin (allowlist) ------------------------------
-- Chỉ truy cập qua các hàm security-definer bên dưới; không cấp policy cho anon/authenticated.
create table if not exists public.admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security;

-- Thêm admin bằng cách chạy (thay email của bạn):
--   insert into public.admin_emails(email) values ('ban.to.chuc@example.com') on conflict do nothing;

-- ---- _is_admin: admin nếu email nằm trong allowlist HOẶC hồ sơ đã role=admin ----
-- security definer để đọc auth.users + admin_emails; chỉ trả boolean về chính người gọi.
create or replace function public._is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and (
        exists (select 1 from public.admin_emails a where lower(a.email) = lower(u.email))
        or exists (select 1 from public.profiles p where p.id = u.id and p.role = 'admin')
      )
  );
$$;

-- ---- create_profile: gán role=admin nếu email thuộc allowlist (thay cho ilike 'admin%') ----
create or replace function public.create_profile(p_name text, p_avatar text, p_level int, p_drinks int)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); r text := 'player';
begin
  if uid is null then raise exception 'forbidden'; end if;
  if exists (
    select 1 from auth.users u join public.admin_emails a on lower(u.email) = lower(a.email)
    where u.id = uid
  ) then r := 'admin'; end if;
  insert into public.profiles (id, name, avatar, level, drinks_per_week, role)
  values (uid, p_name, p_avatar, p_level, p_drinks, r)
  on conflict (id) do update
    set name = excluded.name, avatar = excluded.avatar, level = excluded.level, drinks_per_week = excluded.drinks_per_week,
        role = case when r = 'admin' then 'admin' else public.profiles.role end;  -- lên admin nếu vào allowlist; không tự hạ quyền
  return public.get_profile();
end; $$;

-- ---- admin_stats: tổng quan + danh sách người chơi (khớp AdminStats/AdminPlayer trong types.ts) ----
create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare res json;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  with pl as (
    select p.id, p.name, p.avatar, p.passes_left,
           (select count(*) from public.day_progress d where d.user_id = p.id and d.status = 'checked')::int as days_done,
           public._total_points(p.id) as points,
           public._streak(p.id)       as streak
    from public.profiles p
    where p.role <> 'admin'   -- không tính chính admin vào thống kê người chơi
  )
  select json_build_object(
    'totalPlayers',    (select count(*) from pl),
    'activePlayers',   (select count(*) from pl where days_done > 0 and days_done < 21),
    'eligibleCount',   (select count(*) from pl where days_done >= 14),
    'finishedCount',   (select count(*) from pl where days_done >= 21),
    'avgPoints',       (select coalesce(round(avg(points)), 0) from pl),
    'avgDaysDone',     (select coalesce(round(avg(days_done), 1), 0) from pl),
    'pendingCheckins', (select count(*) from public.checkins where status = 'pending'),
    'players', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'name', name, 'avatar', avatar,
        'daysDone', days_done, 'points', points, 'streak', streak,
        'eligible', days_done >= 14, 'finished', days_done >= 21,
        'usedPass', passes_left < 3
      ) order by points desc), '[]'::json)
      from pl
    )
  ) into res;
  return res;
end; $$;

grant execute on function public.admin_stats() to authenticated;
