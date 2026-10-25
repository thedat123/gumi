-- Giờ đăng bài tường cộng đồng: trả ISO chuẩn UTC ("…Z"). Trước đây to_char(..., 'OF') ra múi giờ "+00"
-- mà trình duyệt không đọc được → mọi bài đều hiện "vừa xong".
create or replace function public.get_wall_posts() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(json_agg(json_build_object(
    'id', id, 'name', name, 'text', text,
    'createdAt', to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ) order by created_at desc), '[]'::json)
  from public.wall_posts
  where public._is_ranked_player(user_id);
$$;
