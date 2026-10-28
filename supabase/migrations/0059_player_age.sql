-- Khảo sát độ tuổi người chơi: hỏi 1 lần trước khi vào game (kể cả người đã có hồ sơ).
-- Admin xem phân bố theo nhóm tuổi trong admin_stats (mỗi người chơi có thêm 'age').

alter table public.profiles add column if not exists age int
  check (age is null or age between 6 and 99);

-- get_profile trả thêm 'age' để frontend biết đã khảo sát chưa.
create or replace function public.get_profile() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'id', p.id, 'name', p.name, 'avatar', p.avatar, 'level', p.level,
    'drinksPerWeek', p.drinks_per_week, 'role', p.role,
    'sugarPassAvailable', p.passes_left > 0,
    'age', p.age
  ) from public.profiles p where p.id = auth.uid();
$$;

-- Người chơi tự ghi tuổi của mình (profiles đã khoá ghi trực tiếp ở 0052 → đi qua RPC).
create or replace function public.set_my_age(p_age int) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if p_age is null or p_age < 6 or p_age > 99 then raise exception 'invalid_age'; end if;
  update public.profiles set age = p_age where id = uid;
  if not found then raise exception 'forbidden'; end if;
  return public.get_profile();
end; $$;

revoke all on function public.set_my_age(int) from public, anon;
grant execute on function public.set_my_age(int) to authenticated;

-- admin_stats: giữ nguyên bản 0053, thêm 'age' cho từng người chơi.
create or replace function public.admin_stats() returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare res json;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  with pl as (
    select p.id, p.name, p.avatar, p.passes_left, p.age,
           (select count(*) from public.day_progress d where d.user_id = p.id and d.status = 'checked')::int as days_done,
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
