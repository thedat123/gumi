-- 1) KHOÁ CỘT ROLE: trước đây policy prof_upd cho người dùng tự UPDATE hồ sơ của mình KHÔNG giới hạn cột
--    → ai cũng tự đổi role thành 'admin'/'gamer' được. Từ giờ role chỉ đổi bằng server (SQL editor/service role).
create or replace function public._lock_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role', 'supabase_admin')
     and coalesce(auth.role(), '') <> 'service_role' then
    new.role := old.role;  -- âm thầm giữ role cũ, các cột khác vẫn cập nhật bình thường
  end if;
  return new;
end $$;
drop trigger if exists profiles_lock_role on public.profiles;
create trigger profiles_lock_role before update on public.profiles
  for each row execute function public._lock_profile_role();

-- 2) KẾT QUẢ SỰ KIỆN LÊN NGAY BẢNG ADMIN: role giờ đã tin được → mọi tài khoản role='gamer' được ghi kết quả,
--    không cần thêm tay vào event_operators (bảng này đang TRỐNG nên mọi kết quả bị RLS chặn, kẹt ở máy chơi).
create or replace function public._is_event_gamer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gamer');
$$;
revoke all on function public._is_event_gamer() from public;
grant execute on function public._is_event_gamer() to authenticated;
