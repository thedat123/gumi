-- Duyệt ảnh: CHỈ hiện ảnh của người chơi thật. Ẩn tester, gamer, admin (đảo lại 0056).
-- Áp dụng cho danh sách ảnh, hàng chờ duyệt tay và số ảnh chờ duyệt ở Tổng quan.
create or replace function public._is_review_visible(p_uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public._is_ranked_player(p_uid);
$$;
