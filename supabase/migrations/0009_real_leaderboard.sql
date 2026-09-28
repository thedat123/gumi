-- =====================================================================
-- 0009 — Bỏ DỮ LIỆU MẪU: bảng xếp hạng & tường chỉ hiển thị người/nội dung THẬT.
--   • Xoá 10 đối thủ giả (leaderboard_seed) + 3 bài tường mẫu (wall_posts seed).
--   • Xếp hạng tính trực tiếp từ người chơi thật (role='player', không phải tester).
-- Idempotent: chạy lại vẫn an toàn.
-- =====================================================================

-- ---- Dọn dữ liệu mẫu ------------------------------------------------
delete from public.leaderboard_seed;                 -- bỏ Mai Anh, Quang Huy, …
delete from public.wall_posts where user_id is null; -- bài tường seed (không gắn user thật)

-- ---- Hạng theo NGƯỜI CHƠI THẬT (điểm cao hơn → hạng nhỏ hơn) --------
-- Loại admin và tài khoản tester/demo khỏi bảng xếp hạng.
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

-- ---- Bảng xếp hạng: top 10 người chơi thật + khối "hạng của tôi" ----
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

  -- Người gọi không thuộc danh sách (tester/admin) → suy ra hạng gần đúng.
  if mp is null then mp := public._total_points(uid); end if;
  if mr is null then mr := public._rank_for(mp); end if;

  return json_build_object(
    'top', top,
    'me', json_build_object(
      'rank', mr, 'points', mp,
      'gapToTop10', case when last_pts is null then 0 else greatest(0, last_pts - mp + 1) end,
      'top10LastName', coalesce(last_name, '')
    )
  );
end; $$;
