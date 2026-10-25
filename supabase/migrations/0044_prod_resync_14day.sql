-- Đưa production về đúng bản 14 ngày mới nhất trong repo, gỡ hết dấu vết bản 21 ngày.
-- Các hàm dưới đây được chép NGUYÊN VĂN từ migration mới nhất định nghĩa nó (ghi chú nguồn ở từng hàm).
-- Production trước đó vẫn chạy bản cũ: chuỗi/điểm/Bùa tính theo 21 ngày, BXH đọc bảng seed giả.

-- 1) Xoá dữ liệu ngày 15–21 (chỉ còn hành trình 1–14) -------------------
delete from public.day_progress where day > 14;
delete from public.checkins     where day > 14;
delete from public.missions     where day > 14;

-- 2) _total_points — nguồn: 0027_fourteen_days.sql
create or replace function public._total_points(p_uid uuid) returns numeric
language plpgsql stable set search_path = public, pg_temp as $$
declare mp numeric; s int; bonus numeric;
begin
  select coalesce(sum(points),0) into mp from public.day_progress where user_id = p_uid and status = 'checked';
  s := public._streak(p_uid);
  bonus := (case when s>=5 then 10 else 0 end) + (case when s>=10 then 20 else 0 end)
         + (case when s>=14 then 30 else 0 end);
  return mp + bonus;
end; $$;

-- 3) _streak — nguồn: 0035_14day_per_user_cleanup.sql
create or replace function public._streak(p_uid uuid) returns int language plpgsql security definer stable as $$
declare d int; ast text; run int := 0; best int := 0; kept boolean;
begin
  for d in 1..14 loop
    select status into ast from public.day_progress where user_id = p_uid and day = d;
    kept := ast in ('checked','passed');
    if kept then run := run + 1; best := greatest(best, run); else run := 0; end if;
  end loop;
  return best;
end; $$;

-- 4) _campaign_day — nguồn: 0027_fourteen_days.sql
create or replace function public._campaign_day() returns int
language sql stable set search_path = public, pg_temp as $$
  select case
    when public._done_count(auth.uid()) >= 14 then 15
    when public._done_today(auth.uid())      then greatest(public._done_count(auth.uid()), 1)
    else public._done_count(auth.uid()) + 1
  end;
$$;

-- 5) _rank_for — nguồn: 0009_real_leaderboard.sql
create or replace function public._rank_for(p numeric) returns int
language sql stable set search_path = public, pg_temp as $$
  select count(*)::int + 1
  from (
    select public._total_points(pr.id) as tp
    from public.profiles pr
    where pr.role = 'player' and coalesce(pr.is_tester, false) = false
  ) x
  where x.tp > p;
$$;

-- 6) get_campaign_state — nguồn: 0027_fourteen_days.sql
create or replace function public.get_campaign_state() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare has_profile boolean; sd date; d int;
begin
  select exists (select 1 from public.profiles where id = auth.uid()) into has_profile;
  if not has_profile then
    return json_build_object('phase', 'running', 'day', 0,
                             'startDate', to_char(public._today_vn(), 'YYYY-MM-DD'));
  end if;
  select (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date into sd
  from public.profiles p where p.id = auth.uid();
  d := public._campaign_day();
  return json_build_object(
    'phase', case when d > 14 then 'ended' else 'running' end,
    'day', least(greatest(d, 1), 14),
    'startDate', to_char(coalesce(sd, public._today_vn()), 'YYYY-MM-DD')
  );
end; $$;

-- 7) get_my_journey — nguồn: 0035_14day_per_user_cleanup.sql
create or replace function public.get_my_journey() returns json language plpgsql security definer stable as $$
declare
  uid uuid := auth.uid();
  is_t boolean := public._is_tester();
  done_cnt int := public._done_count(uid);
  play_day int := public._playable_day();
  frontier int := case when play_day > 0 then play_day else done_cnt + 1 end;
  days text[] := array[]::text[];
  d int; ast text; st text;
  points numeric; streak int; passes int; rej text;
begin
  if uid is null then raise exception 'forbidden'; end if;
  for d in 1..14 loop
    select status into ast from public.day_progress where user_id = uid and day = d;
    if    ast = 'passed'   then st := 'passed';
    elsif ast = 'rejected' then st := 'rejected';
    elsif ast = 'checked'  then st := 'checked';
    elsif is_t                          then st := 'open';
    elsif play_day > 0 and d = play_day then st := 'open';
    elsif d < frontier                  then st := 'missed';
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
    'phase',       case when is_t then 'running'
                        when done_cnt >= 14 then 'ended' else 'running' end,
    'day',         case when play_day > 0 then play_day
                        when done_cnt >= 14 then 14
                        else least(done_cnt + 1, 14) end,
    'days',        to_json(days),
    'totalPoints', points,
    'streak',      streak,
    'rank',        public._rank_for(points),
    'passAvailable', coalesce(passes, 0) > 0,
    'passesLeft',  coalesce(passes, 0),
    'passHoursLeft', null,
    'gumi',        case when days[14] = 'checked' then 'tien_hoa' else 'bo_pho' end,
    'rejectedReason', rej,
    'replayAll',   is_t
  );
end; $$;

-- 8) get_my_summary — nguồn: 0035_14day_per_user_cleanup.sql
create or replace function public.get_my_summary() returns json language plpgsql security definer stable as $$
declare
  uid uuid := auth.uid();
  done_cnt int := public._done_count(auth.uid());
  eligible boolean; grams numeric; lowest int; healthy int; qscore numeric; qmax numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select exists (select 1 from public.day_progress where user_id = uid and day = 14 and status = 'checked') into eligible;
  select coalesce(sum(40 - public._grams(level)), 0) into grams
    from public.day_progress
    where user_id = uid and level is not null
      and day in (select day from public.missions where needs_level);
  select coalesce(min(level), 100) into lowest
    from public.day_progress where user_id = uid and level is not null;
  select count(*) into healthy
    from public.day_progress
    where user_id = uid and status = 'checked'
      and day in (select day from public.missions where kind = 'DRINK');
  select coalesce(score, 0), coalesce(max, (select count(*) * 10 from public.quiz_questions))
    into qscore, qmax from public.quiz_results where user_id = uid;

  return json_build_object(
    'eligible',       eligible,
    'sugarCutGrams',  grams,
    'sugarCutSpoons', round((grams / 4.0) * 10) / 10,
    'lowestLevel',    lowest,
    'healthyCount',   healthy,
    'healthyTotal',   (select count(*) from public.missions where kind = 'DRINK'),
    'quizScore',      coalesce(qscore, 0),
    'quizMax',        coalesce(qmax, (select count(*) * 10 from public.quiz_questions)),
    'streak',         public._streak(uid),
    'totalPoints',    public._total_points(uid),
    'rank',           public._rank_for(public._total_points(uid)),
    'rankFinal',      done_cnt >= 14
  );
end; $$;

-- 9) use_sugar_pass — nguồn: 0034_per_user_campaign_day.sql
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

-- 10) get_leaderboard — nguồn: 0032_leaderboard_players.sql
create or replace function public.get_leaderboard() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  mp numeric; mr int; last_name text; last_pts numeric; top json;
begin
  if uid is null then raise exception 'forbidden'; end if;

  with pts as (
    select pr.id, pr.name, pr.avatar, pr.created_at, public._total_points(pr.id) as points
    from public.profiles pr
    where pr.role = 'player' and coalesce(pr.is_tester, false) = false
  ), ranked as (
    select id, name, avatar, points,
           row_number() over (order by points desc, created_at asc) as rn
    from pts
  )
  select
    coalesce((
      select json_agg(json_build_object(
        'rank', rn, 'name', name, 'avatar', avatar, 'points', points,
        'isMe', case when id = uid then true else null end
      ) order by rn) from ranked where rn <= 10
    ), '[]'::json),
    (select points from ranked where id = uid),
    (select rn     from ranked where id = uid),
    (select name   from ranked where rn = 10),
    (select points from ranked where rn = 10)
  into top, mp, mr, last_name, last_pts;

  return json_build_object(
    'top', top,
    'me', case when mr is null then null else json_build_object(
      'rank', mr, 'points', mp,
      'gapToTop10', case when last_pts is null then 0 else greatest(0, last_pts - mp + 1) end,
      'top10LastName', coalesce(last_name, '')
    ) end
  );
end; $$;

-- 11) admin_stats — nguồn: 0035_14day_per_user_cleanup.sql
create or replace function public.admin_stats() returns json language plpgsql security definer as $$
declare res json;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  with pl as (
    select p.id, p.name, p.avatar, p.passes_left,
           (select count(*) from public.day_progress d where d.user_id = p.id and d.status = 'checked')::int as days_done,
           public._total_points(p.id) as points,
           public._streak(p.id)       as streak
    from public.profiles p
    where p.role <> 'admin'
  )
  select json_build_object(
    'totalPlayers',    (select count(*) from pl),
    'activePlayers',   (select count(*) from pl where days_done > 0 and days_done < 14),
    'eligibleCount',   (select count(*) from pl where days_done >= 14),
    'finishedCount',   (select count(*) from pl where days_done >= 14),
    'avgPoints',       (select coalesce(round(avg(points)), 0) from pl),
    'avgDaysDone',     (select coalesce(round(avg(days_done), 1), 0) from pl),
    'pendingCheckins', (select count(*) from public.checkins where status = 'pending'),
    'players', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'name', name, 'avatar', avatar,
        'daysDone', days_done, 'points', points, 'streak', streak,
        'eligible', days_done >= 14, 'finished', days_done >= 14,
        'usedPass', passes_left < 2
      ) order by points desc), '[]'::json)
      from pl
    )
  ) into res;
  return res;
end; $$;

-- 12) admin_list_checkins — nguồn: 0012_admin_detail.sql
create or replace function public.admin_list_checkins(p_day int) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', c.id, 'user', coalesce(p.name, '—'), 'day', c.day,
      'status', c.status, 'emoji', c.path, 'flag', c.flag,
      'kind', m.kind, 'level', dp.level
    ) order by c.created_at)
    from public.checkins c
    left join public.profiles p      on p.id = c.user_id
    left join public.missions m      on m.day = c.day
    left join public.day_progress dp on dp.user_id = c.user_id and dp.day = c.day
    where c.day = p_day
  ), '[]'::json);
end; $$;

-- 13) admin_list_flags — nguồn: 0012_admin_detail.sql
create or replace function public.admin_list_flags() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', c.id, 'user', coalesce(p.name, '—'), 'day', c.day,
      'status', c.status, 'emoji', c.path, 'flag', c.flag,
      'kind', m.kind, 'level', dp.level
    ) order by c.created_at)
    from public.checkins c
    left join public.profiles p      on p.id = c.user_id
    left join public.missions m      on m.day = c.day
    left join public.day_progress dp on dp.user_id = c.user_id and dp.day = c.day
    where c.flag is not null
  ), '[]'::json);
end; $$;

-- 14) admin_set_checkin_status — nguồn: 0026_social_review.sql
create or replace function public.admin_set_checkin_status(p_id uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c record; pts numeric;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.checkins set status = p_status, reason = p_reason where id = p_id returning * into c;
  if not found then raise exception 'server'; end if;

  if p_status = 'approved' then
    select points into pts from public.missions where day = c.day;
    insert into public.day_progress (user_id, day, status, points)
      values (c.user_id, c.day, 'checked', coalesce(pts,0))
      on conflict (user_id, day) do update set status = 'checked', points = excluded.points;
  elsif p_status = 'rejected' then
    insert into public.day_progress (user_id, day, status, points)
      values (c.user_id, c.day, 'rejected', 0)
      on conflict (user_id, day) do update set status = 'rejected', points = 0;
    insert into public.notifications (user_id, title, body)
      values (
        c.user_id,
        'Ảnh ngày ' || c.day || ' bị từ chối',
        coalesce(nullif(trim(p_reason), ''), 'Ảnh không hợp lệ, điểm ngày này đã bị gỡ. Vui lòng đăng lại ảnh hợp lệ nhé.')
      );
  end if;
end; $$;

