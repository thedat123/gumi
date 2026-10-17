-- Restore player-based rankings on databases still using the seed-based RPC.
-- All authenticated callers see the same top 10; admins/testers have no personal rank.
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
