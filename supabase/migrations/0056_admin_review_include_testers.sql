-- Duyệt ảnh: hiện ảnh của người chơi thật VÀ tester (để test luồng duyệt tay). Gamer/admin vẫn ẩn.
-- Thống kê người chơi, bảng xếp hạng, tường cộng đồng vẫn CHỈ người chơi thật (không đổi).

create or replace function public._is_review_visible(p_uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public._is_ranked_player(p_uid)
      or exists (select 1 from public.profiles p where p.id = p_uid and p.role = 'player' and p.is_tester);
$$;

create or replace function public.admin_list_checkins(p_day integer) returns json
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
    where c.day = p_day and public._is_review_visible(c.user_id)
  ), '[]'::json);
end; $$;

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
    where c.flag is not null and public._is_review_visible(c.user_id)
  ), '[]'::json);
end; $$;

-- Số ảnh chờ duyệt trên Tổng quan khớp với danh sách duyệt (gồm cả tester).
create or replace function public.admin_stats() returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare res json;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  with pl as (
    select p.id, p.name, p.avatar, p.passes_left,
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
                         where c.status = 'pending' and public._is_review_visible(c.user_id)),
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
