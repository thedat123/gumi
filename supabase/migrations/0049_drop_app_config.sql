-- Ngày 1 của MỌI tài khoản (kể cả tester/admin) = ngày đăng ký (profiles.created_at, giờ VN).
-- Bỏ mốc ngày mở sự kiện chung → bảng app_config không còn dùng nên xoá.

create or replace function public._start_date(p_uid uuid) returns date
language sql stable security definer set search_path = public, pg_temp as $$
  select (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date
  from public.profiles p where p.id = p_uid;
$$;

drop table if exists public.app_config;
