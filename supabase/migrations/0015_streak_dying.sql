-- =====================================================================
-- 0015 — Trạng thái "HẤP HỐI" cho streak: lỡ ĐÚNG 1 ngày thì chuỗi CHƯA đứt,
-- vẫn hiện số + Gumi mặt X_X, có 24h để cứu bằng Bùa; lỡ ≥2 ngày mới về 0.
-- Bùa CHỈ cứu streak — KHÔNG bỏ qua chặng (use_sugar_pass không còn được gọi).
-- Idempotent (create or replace).
-- =====================================================================

-- Streak còn "sống" khi chơi hôm nay/hôm qua HOẶC hôm kia (hấp hối, chưa đứt).
-- Lỡ ≥2 ngày (last_play_date <= today - 3) → 0.
create or replace function public._streak(p_uid uuid) returns int
language sql stable set search_path = public, pg_temp as $$
  select case
    when last_play_date is null then 0
    when last_play_date >= public._today_vn() - 2 then coalesce(play_streak, 0)
    else 0
  end
  from public.profiles where id = p_uid;
$$;

-- get_my_journey: thêm Gumi 'hap_hoi' khi hấp hối + số giờ còn lại để cứu.
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
  pstreak int; lpd date; is_dying boolean; can_freeze boolean;
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
  is_dying   := coalesce(pstreak, 0) > 0 and lpd = public._today_vn() - 2;   -- lỡ đúng 1 ngày
  can_freeze := is_dying and coalesce(passes, 0) > 0;                          -- còn Bùa mới cứu được

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
    'passHoursLeft', case when is_dying then 24 - extract(hour from (now() at time zone 'Asia/Ho_Chi_Minh'))::int else null end,
    'gumi', case when is_dying then 'hap_hoi'
                 when days[21] = 'checked' then 'tien_hoa' else 'bo_pho' end,
    'rejectedReason', rej,
    'streakFreezeAvailable', can_freeze,
    'streakAtRisk', case when can_freeze then pstreak else 0 end
  );
end; $$;
