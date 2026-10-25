-- Tường cộng đồng chỉ hiện bài của NGƯỜI CHƠI THẬT (cùng bộ lọc với bảng xếp hạng & trang Quản trị).
-- Bài của tester / gamer / admin: xoá bài hiện có và ẩn bài đăng sau này (cả qua RPC lẫn đọc thẳng bảng).

delete from public.wall_posts where user_id is null or not public._is_ranked_player(user_id);

create or replace function public.get_wall_posts() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(json_agg(json_build_object(
    'id', id, 'name', name, 'text', text, 'createdAt', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  ) order by created_at desc), '[]'::json)
  from public.wall_posts
  where public._is_ranked_player(user_id);
$$;

drop policy if exists wall_read on public.wall_posts;
create policy wall_read on public.wall_posts for select using (public._is_ranked_player(user_id));
