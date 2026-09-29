-- =====================================================================
-- 0014 — BÙA CỨU CHUỖI (streak freeze): lỡ ĐÚNG 1 ngày thì tiêu 1 Bùa để nối lại chuỗi.
-- Bổ sung streakFreezeAvailable + streakAtRisk vào get_my_journey.
-- Idempotent (create or replace).
-- =====================================================================

-- Tiêu 1 Bùa để nối chuỗi khi chơi gần nhất là HÔM KIA (lỡ đúng 1 ngày). Trả về chuỗi được giữ.
create or replace function public.use_streak_freeze() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); today date := public._today_vn(); lpd date; s int; passes int;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select last_play_date, play_streak, passes_left into lpd, s, passes from public.profiles where id = uid;
  if coalesce(passes, 0) <= 0 then raise exception 'no_pass'; end if;
  if coalesce(s, 0) <= 0 or lpd is distinct from today - 2 then raise exception 'not_today'; end if;
  -- Nối chuỗi: coi như đã chơi HÔM QUA → _streak() lại thấy chuỗi còn sống.
  update public.profiles set passes_left = passes_left - 1, last_play_date = today - 1 where id = uid;
  return s;
end; $$;

grant execute on function public.use_streak_freeze() to authenticated;

-- get_my_journey: thêm cờ cứu chuỗi + độ dài chuỗi đang treo.
create or replace function public.get_my_journey() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  op  int  := public._playable_day();
  cday int := public._campaign_day();
  unlocked boolean := public._is_tester() or public._is_admin();
  days text[] := array[]::text[];
  d int; ast text; st text;
  points numeric; streak int; passes int; rej text;
  pstreak int; lpd date; can_freeze boolean;
begin
  if uid is null then raise exception 'forbidden'; end if;

  for d in 1..21 loop
    select status into ast from public.day_progress where user_id = uid and day = d;
    if ast in ('checked', 'passed', 'rejected') then
      st := ast;
    elsif unlocked then
      st := 'open';
    elsif op > 0 and d = op then
      st := 'open';
    else
      st := 'future';
    end if;
    days := array_append(days, st);
  end loop;

  points := public._total_points(uid);
  streak := public._streak(uid);
  select passes_left, play_streak, last_play_date into passes, pstreak, lpd from public.profiles where id = uid;
  can_freeze := coalesce(passes, 0) > 0 and coalesce(pstreak, 0) > 0 and lpd = public._today_vn() - 2;

  select coalesce(nullif(trim(c.reason), ''), 'ảnh không hợp lệ') into rej
  from public.day_progress dp
  left join public.checkins c
    on c.user_id = dp.user_id and c.day = dp.day and c.status = 'rejected'
  where dp.user_id = uid and dp.status = 'rejected'
  order by dp.day desc limit 1;

  return json_build_object(
    'phase', case when unlocked then 'running' when cday > 21 then 'ended' else 'running' end,
    'day', least(greatest(cday, 1), 21),
    'days', to_json(days),
    'totalPoints', points,
    'streak', streak,
    'rank', public._rank_for(points),
    'passAvailable', coalesce(passes, 0) > 0,
    'passesLeft', coalesce(passes, 0),
    'passHoursLeft', null,
    'gumi', case when days[21] = 'checked' then 'tien_hoa' else 'bo_pho' end,
    'rejectedReason', rej,
    'streakFreezeAvailable', can_freeze,
    'streakAtRisk', case when can_freeze then pstreak else 0 end
  );
end; $$;
