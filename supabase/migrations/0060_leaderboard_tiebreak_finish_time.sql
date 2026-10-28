-- Hoà điểm: ai HOÀN THÀNH SỚM HƠN xếp trên.
-- "Thời điểm hoàn thành" = lúc người chơi hoàn thành chặng gần nhất (day_progress 'checked' mới nhất),
-- tức là lúc họ đạt tới số điểm hiện tại. Người đã xong 14 ngày → chính là lúc về đích.
-- Thứ tự: điểm giảm dần → hoàn thành sớm hơn → còn nhiều Bùa hơn → tham gia sớm hơn → id (ổn định).
-- Bảng xếp hạng chỉ trả TOP 20; người ngoài top vẫn thấy hạng của mình qua 'me'.
-- (Giữ tên trường gapToTop10/top10LastName cho khớp hợp đồng API, nhưng mốc giờ là hạng 20.)
-- Dùng chung một thứ tự cho bảng xếp hạng VÀ hạng ở Hành trình/Tổng kết (_rank_for) để không lệch nhau.

create or replace function public._leaderboard() returns table (id uuid, name text, avatar text, points numeric, rn int)
language sql stable security definer set search_path = public, pg_temp as $$
  with pts as (
    select pr.id, pr.name, pr.avatar, pr.created_at, coalesce(pr.passes_left, 0) as passes,
           public._total_points(pr.id) as points,
           (select max(d.created_at) from public.day_progress d
             where d.user_id = pr.id and d.status = 'checked') as done_at
    from public.profiles pr
    where public._is_ranked_player(pr.id)
  )
  select id, name, avatar, points,
         (row_number() over (order by points desc, done_at asc nulls last, passes desc, created_at asc, id))::int as rn
  from pts;
$$;

revoke all on function public._leaderboard() from public, anon, authenticated;

-- Hạng của CHÍNH người gọi (Hành trình/Tổng kết luôn gọi với điểm của auth.uid()).
-- Người không lên bảng (tester/admin) → giữ cách tính cũ theo điểm.
create or replace function public._rank_for(p numeric) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select l.rn from public._leaderboard() l where l.id = auth.uid() and l.points = p),
    (select count(*)::int + 1 from public._leaderboard() l where l.points > p)
  );
$$;

create or replace function public.get_leaderboard() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  mp numeric; mr int; last_name text; last_pts numeric; top json;
begin
  if uid is null then raise exception 'forbidden'; end if;

  with lb as materialized (select * from public._leaderboard())
  select
    coalesce((
      select json_agg(json_build_object(
        'rank', rn, 'name', name, 'avatar', avatar, 'points', points,
        'isMe', case when id = uid then true else null end
      ) order by rn) from lb where rn <= 20
    ), '[]'::json),
    (select points from lb where id = uid),
    (select rn     from lb where id = uid),
    (select name   from lb where rn = 20),
    (select points from lb where rn = 20)
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
