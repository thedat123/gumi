-- Dùng vé (Sugar Pass) = ngày đó coi như xong, +1 ngày.
-- admin_stats đếm ngày 'passed' vào daysDone → người dùng vé đủ 14 chặng hiện 14/14 và "Về đích".
-- (Phía người chơi _done_count đã đếm 'passed' từ 0011.)

create or replace function public.admin_stats() returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare res json;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  with pl as (
    select p.id, p.name, p.avatar, p.passes_left, p.age,
           (select count(*) from public.day_progress d
             where d.user_id = p.id and d.status in ('checked', 'passed'))::int as days_done,
           public._total_points(p.id) as points,
           public._streak(p.id)       as streak
    from public.profiles p
    where public._is_ranked_player(p.id)
  )
  select json_build_object(
    'totalPlayers',    (select count(*) from pl),
    'activePlayers',   (select count(*) from pl where days_done > 0 and days_done < 14),
    'eligibleCount',   (select count(*) from pl where days_done >= 14),
    'finishedCount',   (select count(*) from pl where days_done >= 14),
    'avgPoints',       (select coalesce(round(avg(points)), 0) from pl),
    'avgDaysDone',     (select coalesce(round(avg(days_done), 1), 0) from pl),
    'pendingCheckins', (select count(*) from public.checkins c
                         where c.status = 'pending' and public._is_ranked_player(c.user_id)),
    'players', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'name', name, 'avatar', avatar,
        'daysDone', days_done, 'points', points, 'streak', streak,
        'eligible', days_done >= 14, 'finished', days_done >= 14,
        'usedPass', passes_left < 2,
        'age', age
      ) order by points desc), '[]'::json)
      from pl
    )
  ) into res;
  return res;
end; $$;

-- get_my_summary: dùng vé ở chặng 14 cũng tính là về đích (giữ nguyên bản 0044).
create or replace function public.get_my_summary() returns json language plpgsql security definer stable as $$
declare
  uid uuid := auth.uid();
  done_cnt int := public._done_count(auth.uid());
  eligible boolean; grams numeric; lowest int; healthy int; qscore numeric; qmax numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select exists (select 1 from public.day_progress where user_id = uid and day = 14 and status in ('checked', 'passed')) into eligible;
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
