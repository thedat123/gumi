-- =====================================================================
-- 0007 — Vai trò TESTER: mở khoá toàn bộ 21 ngày + bỏ chặn "chỉ chơi ngày hôm nay".
-- Dành cho các tài khoản demo/QA (seed ở 0008). KHÔNG ảnh hưởng người chơi thật.
-- =====================================================================

-- ---- Cờ tester trên hồ sơ -------------------------------------------
alter table public.profiles add column if not exists is_tester boolean not null default false;

-- ---- _is_tester: true nếu hồ sơ người gọi có is_tester ---------------
create or replace function public._is_tester() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select is_tester from public.profiles where id = auth.uid()), false);
$$;

-- ---- get_my_journey: tester thấy MỌI ngày chưa làm = 'open' ---------
create or replace function public.get_my_journey() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  cday int := public._campaign_day();
  is_t boolean := public._is_tester();
  days text[] := array[]::text[];
  d int; ast text; st text;
  points numeric; streak int; passes int; rej text;
begin
  if uid is null then raise exception 'forbidden'; end if;
  for d in 1..21 loop
    select status into ast from public.day_progress where user_id = uid and day = d;
    if    ast = 'passed'   then st := 'passed';
    elsif ast = 'rejected' then st := 'rejected';
    elsif ast = 'checked'  then st := 'checked';
    elsif is_t             then st := 'open';   -- tester: ngày chưa làm nào cũng mở
    elsif d < cday         then st := 'missed';
    elsif d = cday         then st := 'open';
    else                        st := 'future';
    end if;
    days := array_append(days, st);
  end loop;

  points := public._total_points(uid);
  streak := public._streak(uid);
  select passes_left into passes from public.profiles where id = uid;
  select coalesce(nullif(trim(c.reason), ''), 'ảnh không hợp lệ') into rej
  from public.day_progress dp
  left join public.checkins c
    on c.user_id = dp.user_id and c.day = dp.day and c.status = 'rejected'
  where dp.user_id = uid and dp.status = 'rejected'
  order by dp.day desc limit 1;

  return json_build_object(
    'phase', case when is_t then 'running'
                  when cday < 1 then 'before' when cday > 21 then 'ended' else 'running' end,
    'day', least(greatest(cday, 1), 21),
    'days', to_json(days),
    'totalPoints', points,
    'streak', streak,
    'rank', public._rank_for(points),
    'passAvailable', coalesce(passes, 0) > 0,
    'passesLeft', coalesce(passes, 0),
    'passHoursLeft', null,
    'gumi', case when days[21] = 'checked' then 'tien_hoa' else 'bo_pho' end,
    'rejectedReason', rej
  );
end; $$;

-- ---- submit_checkin: tester được check-in mọi ngày (bỏ chặn not_today) ----
create or replace function public.submit_checkin(p_day int, p_level int, p_path text)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); cday int := public._campaign_day(); mk text; pts numeric; needs boolean;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if p_day <> cday and not public._is_tester() then raise exception 'not_today'; end if;
  select kind, points, needs_level into mk, pts, needs from public.missions where day = p_day;
  if mk is null or mk not in ('DRINK','SHARE') then raise exception 'not_today'; end if;
  if exists (select 1 from public.day_progress where user_id = uid and day = p_day and status in ('checked','passed'))
    then raise exception 'already_done'; end if;
  if needs and p_level not in (70,50,30,0) then raise exception 'level_not_allowed'; end if;

  insert into public.checkins (user_id, day, path, status) values (uid, p_day, p_path, 'approved');
  insert into public.day_progress (user_id, day, status, points, level)
    values (uid, p_day, 'checked', pts, case when needs then p_level else null end)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, level = excluded.level;

  return json_build_object('ok', true, 'points', pts);
end; $$;

-- ---- submit_minigame: tester được chơi mini-game mọi ngày -----------
create or replace function public.submit_minigame(p_day int)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); cday int := public._campaign_day(); mk text; pts numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select kind, points into mk, pts from public.missions where day = p_day;
  if mk is null or p_day = 2 or mk not in ('GAME','KNOW','FINAL') then raise exception 'server'; end if;
  if p_day <> cday and not public._is_tester() then raise exception 'not_today'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, p_day, 'checked', coalesce(pts,0))
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points;
  return json_build_object('ok', true, 'points', coalesce(pts,0));
end; $$;

grant execute on function public._is_tester() to authenticated;
