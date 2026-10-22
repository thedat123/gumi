-- Admin: xoá bài tường cộng đồng (kiểm tra _is_admin trước).
create or replace function public.admin_delete_wall_post(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  delete from public.wall_posts where id = p_id;
end;
$$;
