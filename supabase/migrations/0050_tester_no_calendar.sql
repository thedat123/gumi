-- Tài khoản tester & admin KHÔNG tính ngày theo lịch: không có ngày bắt đầu, không bao giờ "hết hành trình",
-- mở hết 14 ngày. "Ngày hiện tại" hiển thị = ngày đầu tiên chưa làm (để phòng Gumi gợi ý chặng kế tiếp).
-- Không nhận nhắc nhở theo lịch (vẫn test được bằng workflow "Push reminders" → test_email).

create or replace function public._no_calendar(p_uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select p.is_tester or p.role = 'admin' from public.profiles p where p.id = p_uid), false)
      or exists (select 1 from auth.users u join public.admin_emails a on lower(a.email) = lower(u.email) where u.id = p_uid);
$$;

-- Ngày đầu tiên chưa làm (1..14), 14 nếu đã làm hết.
create or replace function public._first_open_day(p_uid uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(min(d), 14) from generate_series(1, 14) d where not public._kept(p_uid, d);
$$;

-- Ngày bắt đầu: ngày đăng ký; tester/admin → NULL (kéo theo _day_of/_campaign_day = NULL).
create or replace function public._start_date(p_uid uuid) returns date
language sql stable security definer set search_path = public, pg_temp as $$
  select case when public._no_calendar(p_uid) then null
              else (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date end
  from public.profiles p where p.id = p_uid;
$$;

-- Chuỗi: tester/admin không có "hôm nay" → dùng chuỗi dài nhất.
create or replace function public._streak(p_uid uuid) returns int
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare a int := public._day_of(p_uid); run int := 0;
begin
  if a is null then return public._best_streak(p_uid); end if;
  if a < 1 then return 0; end if;
  if a > 14 then a := 14;
  elsif not public._kept(p_uid, a) then a := a - 1;
  end if;
  while a >= 1 and public._kept(p_uid, a) loop
    run := run + 1; a := a - 1;
  end loop;
  return run;
end; $$;

-- Bùa: tester/admin không có ngày lỡ theo lịch → không dùng được.
create or replace function public.use_streak_freeze(p_day int default null) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); cday int; target int; passes int;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select passes_left into passes from public.profiles where id = uid for update;
  if coalesce(passes, 0) <= 0 then raise exception 'no_pass'; end if;
  cday := public._day_of(uid);
  if cday is null then raise exception 'not_today'; end if;
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

create or replace function public.get_campaign_state() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); sd date; d int;
begin
  if uid is not null and public._no_calendar(uid) then
    return json_build_object('phase', 'running', 'day', public._first_open_day(uid),
                             'startDate', to_char(public._today_vn(), 'YYYY-MM-DD'));
  end if;
  sd := public._start_date(uid);
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
  free boolean;
  cday int; days text[] := array[]::text[];
  d int; ast text; st text;
  points numeric; streak int; passes int; rej text;
  risk int := 0; hours int; last_missed int;
begin
  if uid is null then raise exception 'forbidden'; end if;
  free := public._is_tester() or public._no_calendar(uid);
  cday := case when free then public._first_open_day(uid) else coalesce(public._day_of(uid), 1) end;

  for d in 1..14 loop
    select status into ast from public.day_progress where user_id = uid and day = d;
    if    ast = 'passed'   then st := 'passed';
    elsif ast = 'rejected' then st := 'rejected';
    elsif ast = 'checked'  then st := 'checked';
    elsif free             then st := 'open';
    elsif d < cday         then st := 'missed';
    elsif d = cday         then st := 'open';
    else                        st := 'future';
    end if;
    days := array_append(days, st);
  end loop;

  -- Gumi hấp hối (chỉ người chơi theo lịch): hôm qua lỡ, hôm nay chưa chơi, trước đó đang có chuỗi.
  if not free and cday between 2 and 14 and not public._kept(uid, cday) and not public._kept(uid, cday - 1) then
    d := cday - 2;
    while d >= 1 and public._kept(uid, d) loop risk := risk + 1; d := d - 1; end loop;
  end if;
  if risk > 0 then
    hours := greatest(1, 24 - extract(hour from now() at time zone 'Asia/Ho_Chi_Minh')::int);
  end if;

  points := public._total_points(uid);
  streak := public._streak(uid);
  last_missed := case when free then null else public._last_missed_day(uid) end;
  select passes_left into passes from public.profiles where id = uid;
  select coalesce(nullif(trim(c.reason), ''), 'ảnh không hợp lệ') into rej
  from public.day_progress dp
  left join public.checkins c
    on c.user_id = dp.user_id and c.day = dp.day and c.status = 'rejected'
  where dp.user_id = uid and dp.status = 'rejected'
  order by dp.day desc limit 1;

  return json_build_object(
    'phase',       case when free then 'running' when cday > 14 then 'ended' else 'running' end,
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
    'replayAll',   free,
    'streakFreezeAvailable', coalesce(passes, 0) > 0 and last_missed is not null,
    'streakAtRisk', risk
  );
end; $$;

-- Nhắc nhở theo lịch: bỏ qua tài khoản không tính lịch (phase 'none').
create or replace function public.reminder_users()
returns table(user_id uuid, email text, name text, campaign_day int, phase text,
              last_play_date date, last_completed_date date)
language sql security definer stable set search_path = public, pg_temp as $$
  select
    p.id,
    case when p.email_reminders and p.role = 'player' and u.email_confirmed_at is not null
         then u.email end,
    p.name,
    d.cday,
    case when d.cday is null then 'none' when d.cday > 14 then 'ended' when d.cday < 1 then 'before' else 'running' end,
    p.last_play_date,
    (select max((dp.created_at at time zone 'Asia/Ho_Chi_Minh')::date)
       from public.day_progress dp where dp.user_id = p.id and dp.status = 'checked')
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join lateral (select public._day_of(p.id) as cday) d;
$$;
revoke all on function public.reminder_users() from public, anon, authenticated;
grant execute on function public.reminder_users() to service_role;
