-- Bảng xếp hạng: hiển thị TẤT CẢ người chơi thật (không giới hạn top 10).
-- Loại khỏi bảng: tester (is_tester), gamer (role 'gamer'), admin (role 'admin' hoặc email trong admin_emails).
-- Hoà điểm: ai còn nhiều Bùa Hồi Sinh hơn xếp trên, rồi tới ai tham gia sớm hơn.

-- Một nguồn duy nhất cho "ai được lên bảng".
create or replace function public._is_ranked_player(p_uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from public.profiles pr
    join auth.users u on u.id = pr.id
    where pr.id = p_uid
      and pr.role = 'player'
      and coalesce(pr.is_tester, false) = false
      and not exists (select 1 from public.admin_emails a where lower(a.email) = lower(u.email))
  );
$$;

create or replace function public._rank_for(p numeric) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int + 1
  from (
    select public._total_points(pr.id) as tp
    from public.profiles pr
    where public._is_ranked_player(pr.id)
  ) x
  where x.tp > p;
$$;

create or replace function public.get_leaderboard() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  mp numeric; mr int; last_name text; last_pts numeric; top json;
begin
  if uid is null then raise exception 'forbidden'; end if;

  with pts as (
    select pr.id, pr.name, pr.avatar, pr.created_at, coalesce(pr.passes_left, 0) as passes,
           public._total_points(pr.id) as points
    from public.profiles pr
    where public._is_ranked_player(pr.id)
  ), ranked as (
    select id, name, avatar, points,
           row_number() over (order by points desc, passes desc, created_at asc) as rn
    from pts
  )
  select
    coalesce((
      select json_agg(json_build_object(
        'rank', rn, 'name', name, 'avatar', avatar, 'points', points,
        'isMe', case when id = uid then true else null end
      ) order by rn) from ranked
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

grant execute on function public.get_leaderboard() to authenticated;
