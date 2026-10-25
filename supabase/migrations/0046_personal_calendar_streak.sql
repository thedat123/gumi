-- Hành trình 14 ngày theo LỊCH CÁ NHÂN:
--   • Ngày 1 = ngày người chơi đăng ký (nếu đăng ký trước khi sự kiện mở thì Ngày 1 = ngày mở sự kiện).
--   • Mỗi ngày lịch trôi qua là sang ngày kế tiếp. Hôm nay chỉ chơi được nhiệm vụ của hôm nay;
--     ngày không chơi thành "Đã lỡ" (không chơi bù được).
--   • Chuỗi = số ngày LIÊN TIẾP gần nhất đã chơi (hoặc đã dùng Bùa), đếm lùi từ hôm nay/hôm qua.
--     Lỡ 1 ngày là chuỗi đứt: chơi lại thì chuỗi bắt đầu từ 1.
--   • Bùa Hồi Sinh lấp 1 ngày đã lỡ (0 điểm). Ngày được lấp chỉ nối chuỗi khi các ngày liền nhau.
--     VD: lỡ ngày 1 và 2, ngày 3 mới chơi, dùng Bùa cho ngày 1 → chuỗi vẫn là 1 (ngày 2 còn lỡ).
--   • Thưởng chuỗi (5/10/14) tính theo chuỗi DÀI NHẤT từng đạt, để mốc đã đạt không bị mất.

-- 1) Ngày bắt đầu & ngày hiện tại của từng người -----------------------
create or replace function public._start_date(p_uid uuid) returns date
language sql stable security definer set search_path = public, pg_temp as $$
  select greatest(
    (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date,
    coalesce((select c.start_date from public.app_config c limit 1),
             (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date))
  from public.profiles p where p.id = p_uid;
$$;

create or replace function public._day_of(p_uid uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select (public._today_vn() - public._start_date(p_uid)) + 1;
$$;

create or replace function public._campaign_day() returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select public._day_of(auth.uid());
$$;

-- Ngày đã "giữ" (chơi xong hoặc dùng Bùa).
create or replace function public._kept(p_uid uuid, p_day int) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.day_progress
                 where user_id = p_uid and day = p_day and status in ('checked', 'passed'));
$$;

-- Hôm nay chơi được ngày nào (0 = không có: đã chơi xong hôm nay / ngoài 1..14).
create or replace function public._playable_day() returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when public._campaign_day() between 1 and 14
         and not public._kept(auth.uid(), public._campaign_day())
      then public._campaign_day()
    else 0
  end;
$$;

-- 2) Chuỗi ---------------------------------------------------------------
-- Chuỗi hiện tại: đếm lùi các ngày liên tiếp đã giữ, bắt đầu từ hôm nay (nếu đã chơi) hoặc hôm qua.
create or replace function public._streak(p_uid uuid) returns int
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare a int := public._day_of(p_uid); run int := 0;
begin
  if a is null or a < 1 then return 0; end if;
  if a > 14 then a := 14;
  elsif not public._kept(p_uid, a) then a := a - 1;
  end if;
  while a >= 1 and public._kept(p_uid, a) loop
    run := run + 1; a := a - 1;
  end loop;
  return run;
end; $$;

-- Chuỗi dài nhất từng đạt trong 14 ngày (dùng cho thưởng mốc 5/10/14).
create or replace function public._best_streak(p_uid uuid) returns int
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare d int; run int := 0; best int := 0;
begin
  for d in 1..14 loop
    if public._kept(p_uid, d) then run := run + 1; best := greatest(best, run); else run := 0; end if;
  end loop;
  return best;
end; $$;

create or replace function public._total_points(p_uid uuid) returns numeric
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare mp numeric; s int;
begin
  select coalesce(sum(points), 0) into mp from public.day_progress where user_id = p_uid and status = 'checked';
  s := public._best_streak(p_uid);
  return mp + (case when s >= 5 then 10 else 0 end) + (case when s >= 10 then 20 else 0 end)
            + (case when s >= 14 then 30 else 0 end);
end; $$;

-- Ngày đã lỡ gần nhất (trước hôm nay), NULL nếu không có.
create or replace function public._last_missed_day(p_uid uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select max(d) from generate_series(1, least(public._day_of(p_uid) - 1, 14)) d
  where not public._kept(p_uid, d);
$$;

-- 3) Bùa Hồi Sinh: lấp 1 ngày đã lỡ (mặc định ngày lỡ gần nhất) ------------
drop function if exists public.use_sugar_pass();
drop function if exists public.use_streak_freeze();

create or replace function public.use_streak_freeze(p_day int default null) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); cday int; target int; passes int;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select passes_left into passes from public.profiles where id = uid for update;
  if coalesce(passes, 0) <= 0 then raise exception 'no_pass'; end if;
  cday := public._day_of(uid);
  target := coalesce(p_day, public._last_missed_day(uid));
  if target is null or target < 1 or target > 14 or target >= cday or public._kept(uid, target) then
    raise exception 'not_today';
  end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, target, 'passed', 0)
    on conflict (user_id, day) do update set status = 'passed', points = 0;
  update public.profiles set passes_left = passes_left - 1 where id = uid;
  return public._streak(uid);
end; $$;
grant execute on function public.use_streak_freeze(int) to authenticated;

-- 4) Trạng thái hành trình ------------------------------------------------
create or replace function public.get_campaign_state() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare sd date; d int;
begin
  sd := public._start_date(auth.uid());
  if sd is null then
    return json_build_object('phase', 'running', 'day', 0,
                             'startDate', to_char(public._today_vn(), 'YYYY-MM-DD'));
  end if;
  d := (public._today_vn() - sd) + 1;
  return json_build_object(
    'phase', case when d > 14 then 'ended' else 'running' end,
    'day', least(greatest(d, 1), 14),
    'startDate', to_char(sd, 'YYYY-MM-DD'));
end; $$;

create or replace function public.get_my_journey() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  is_t boolean := public._is_tester();
  cday int; days text[] := array[]::text[];
  d int; ast text; st text;
  points numeric; streak int; passes int; rej text;
  risk int := 0; hours int; last_missed int;
begin
  if uid is null then raise exception 'forbidden'; end if;
  cday := coalesce(public._day_of(uid), 1);

  for d in 1..14 loop
    select status into ast from public.day_progress where user_id = uid and day = d;
    if    ast = 'passed'   then st := 'passed';
    elsif ast = 'rejected' then st := 'rejected';
    elsif ast = 'checked'  then st := 'checked';
    elsif is_t             then st := 'open';
    elsif d < cday         then st := 'missed';
    elsif d = cday         then st := 'open';
    else                        st := 'future';
    end if;
    days := array_append(days, st);
  end loop;

  -- Gumi hấp hối: hôm qua lỡ, hôm nay chưa chơi, và trước đó đang có chuỗi → chuỗi đó sắp mất.
  if cday between 2 and 14 and not public._kept(uid, cday) and not public._kept(uid, cday - 1) then
    d := cday - 2;
    while d >= 1 and public._kept(uid, d) loop risk := risk + 1; d := d - 1; end loop;
  end if;
  if risk > 0 then
    hours := greatest(1, 24 - extract(hour from now() at time zone 'Asia/Ho_Chi_Minh')::int);
  end if;

  points := public._total_points(uid);
  streak := public._streak(uid);
  last_missed := public._last_missed_day(uid);
  select passes_left into passes from public.profiles where id = uid;
  select coalesce(nullif(trim(c.reason), ''), 'ảnh không hợp lệ') into rej
  from public.day_progress dp
  left join public.checkins c
    on c.user_id = dp.user_id and c.day = dp.day and c.status = 'rejected'
  where dp.user_id = uid and dp.status = 'rejected'
  order by dp.day desc limit 1;

  return json_build_object(
    'phase',       case when is_t then 'running' when cday > 14 then 'ended' else 'running' end,
    'day',         least(greatest(cday, 1), 14),
    'days',        to_json(days),
    'totalPoints', points,
    'streak',      streak,
    'rank',        public._rank_for(points),
    'passAvailable', coalesce(passes, 0) > 0,
    'passesLeft',  coalesce(passes, 0),
    'passHoursLeft', hours,
    'gumi',        case when days[14] = 'checked' then 'tien_hoa'
                        when risk > 0 then 'hap_hoi' else 'bo_pho' end,
    'rejectedReason', rej,
    'replayAll',   is_t,
    'streakFreezeAvailable', coalesce(passes, 0) > 0 and last_missed is not null,
    'streakAtRisk', risk
  );
end; $$;
