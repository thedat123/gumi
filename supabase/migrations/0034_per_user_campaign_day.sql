-- Fix: dùng per-user campaign day thay vì global _campaign_day().
-- submit_checkin / submit_minigame / get_my_journey / use_sugar_pass
-- đều phải dựa vào _playable_day() (done_count + 1) để mỗi user tự tiến theo
-- tiến độ của họ, không bị block bởi start_date toàn cục.
-- Đồng thời sửa _playable_day() cap từ 14 → 21 (campaign 21 ngày).

-- 1. _playable_day: 14 → 21
create or replace function public._playable_day() returns int language sql security definer stable as $$
  select case
    when public._done_count(auth.uid()) >= 21 then 0
    when public._done_today(auth.uid())        then 0
    else public._done_count(auth.uid()) + 1
  end;
$$;

-- 2. submit_checkin: per-user _playable_day() thay vì _campaign_day()
create or replace function public.submit_checkin(
  p_day int, p_level int, p_path text,
  p_needs_review boolean default false,
  p_sugar_percent numeric default null
) returns json language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  play_day int := public._playable_day();
  mk text; pts numeric; needs boolean;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not public._is_tester() and (play_day = 0 or p_day <> play_day) then
    raise exception 'not_today';
  end if;
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

-- 3. submit_minigame: per-user _playable_day() thay vì _campaign_day()
create or replace function public.submit_minigame(p_day int) returns json language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  play_day int := public._playable_day();
  mk text; pts numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select kind, points into mk, pts from public.missions where day = p_day;
  if mk is null or p_day = 2 or mk not in ('GAME','KNOW','FINAL') then raise exception 'server'; end if;
  if not public._is_tester() and (play_day = 0 or p_day <> play_day) then raise exception 'not_today'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, p_day, 'checked', coalesce(pts,0))
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points;
  return json_build_object('ok', true, 'points', coalesce(pts,0));
end; $$;

-- 4. use_sugar_pass: per-user _playable_day() thay vì _campaign_day()
create or replace function public.use_sugar_pass() returns void language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  play_day int := public._playable_day();
  left_ int;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if play_day = 0 then raise exception 'not_today'; end if;
  select passes_left into left_ from public.profiles where id = uid;
  if coalesce(left_, 0) <= 0 then raise exception 'no_pass'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, play_day, 'passed', 0)
    on conflict (user_id, day) do update set status = 'passed', points = 0;
  update public.profiles set passes_left = passes_left - 1 where id = uid;
end; $$;

-- 5. get_my_journey: per-user campaign day thay vì global _campaign_day()
create or replace function public.get_my_journey() returns json language plpgsql security definer stable as $$
declare
  uid uuid := auth.uid();
  is_t boolean := public._is_tester();
  done_cnt int := public._done_count(uid);
  play_day int := public._playable_day(); -- 0 = đã chơi hôm nay hoặc hoàn thành cả hành trình
  -- frontier: ngày tiếp theo cần chơi (kể cả khi đã chơi hôm nay)
  frontier int := case when play_day > 0 then play_day else done_cnt + 1 end;
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
    elsif is_t                          then st := 'open';
    elsif play_day > 0 and d = play_day then st := 'open';  -- ngày đang mở hôm nay
    elsif d < frontier                  then st := 'missed'; -- bỏ qua không làm
    else                                     st := 'future';
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
                  when done_cnt >= 21 then 'ended' else 'running' end,
    'day',  case when play_day > 0 then play_day
                 when done_cnt >= 21 then 21
                 else least(done_cnt + 1, 21) end,
    'days', to_json(days),
    'totalPoints', points,
    'streak', streak,
    'rank', public._rank_for(points),
    'passAvailable', coalesce(passes, 0) > 0,
    'passesLeft', coalesce(passes, 0),
    'passHoursLeft', null,
    'gumi', case when days[21] = 'checked' then 'tien_hoa' else 'bo_pho' end,
    'rejectedReason', rej,
    'replayAll', is_t
  );
end; $$;
