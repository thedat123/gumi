-- Dọn sạch tất cả tham chiếu 21-ngày và _campaign_day() còn sót lại.
-- Campaign là 14 ngày. Mọi validation đều dựa trên tiến độ cá nhân (done_count),
-- không phụ thuộc start_date toàn cục hay calendar date.

-- 1. _playable_day: cap 21 → 14
create or replace function public._playable_day() returns int language sql security definer stable as $$
  select case
    when public._done_count(auth.uid()) >= 14 then 0
    when public._done_today(auth.uid())        then 0
    else public._done_count(auth.uid()) + 1
  end;
$$;

-- 2. Drop submit_checkin overloads cũ (3-arg và integer-type) còn dùng _campaign_day()
drop function if exists public.submit_checkin(integer, integer, text);
drop function if exists public.submit_checkin(integer, integer, text, boolean, integer);

-- 3. _streak: bỏ dead code _campaign_day(), đổi loop 1..21 → 1..14
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

-- 4. get_my_summary: per-user eligible (day 14) và rankFinal (done_count >= 14)
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

-- 5. get_my_journey: 21 → 14 ở tất cả chỗ
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

-- 6. reminder_targets: done_count >= 21 → >= 14, cday > 21 → > 14
create or replace function public.reminder_targets()
returns table(user_id uuid, endpoint text, p256dh text, auth text,
              campaign_day int, phase text, last_play_date date, last_completed_date date)
language sql security definer stable as $$
  select
    ps.user_id, ps.endpoint, ps.p256dh, ps.auth,
    dc.cday as campaign_day,
    case when dc.cday > 14 then 'ended' else 'running' end as phase,
    p.last_play_date,
    lc.last_completed as last_completed_date
  from public.push_subscriptions ps
  join public.profiles p on p.id = ps.user_id
  cross join lateral (
    select
      (select count(*) from public.day_progress dp
         where dp.user_id = ps.user_id and dp.status in ('checked','passed'))::int as done_count,
      exists (select 1 from public.day_progress dp
         where dp.user_id = ps.user_id and dp.status in ('checked','passed')
           and (dp.created_at at time zone 'Asia/Ho_Chi_Minh')::date = public._today_vn()) as done_today
  ) base
  cross join lateral (
    select case
      when base.done_count >= 14 then 15
      when base.done_today      then greatest(base.done_count, 1)
      else base.done_count + 1
    end as cday
  ) dc
  left join lateral (
    select max((dp.created_at at time zone 'Asia/Ho_Chi_Minh')::date) as last_completed
    from public.day_progress dp
    where dp.user_id = ps.user_id and dp.status = 'checked'
  ) lc on true;
$$;

-- 7. admin_stats: 21 → 14, passes_left < 3 → < 2 (max passes = 2)
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
