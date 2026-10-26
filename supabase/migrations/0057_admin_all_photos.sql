-- Duyệt ảnh: admin thấy MỌI ảnh check-in (kể cả ảnh AI đã tự duyệt), không chỉ ảnh chờ duyệt tay.
-- Ảnh AI duyệt mà không đạt → admin gỡ (rejected, 0 điểm, báo người chơi). Ảnh OK → giữ nguyên điểm AI.

alter table public.checkins add column if not exists reviewed_at timestamptz;

-- Ảnh đã được admin xử lý trước đây (có cờ, không còn pending) coi như đã xem.
update public.checkins set reviewed_at = created_at
  where reviewed_at is null and flag is not null and status <> 'pending';

-- Mỗi người chơi, mỗi ngày: chỉ lấy ảnh MỚI NHẤT (ảnh cũ bị thay khi gửi lại).
create or replace function public.admin_list_photos() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', x.id, 'user', x.name, 'day', x.day,
      'status', x.status, 'emoji', x.path, 'flag', x.flag, 'reason', x.reason,
      'kind', x.kind, 'level', x.level,
      'reviewed', x.reviewed_at is not null, 'createdAt', x.created_at
    ) order by x.created_at desc)
    from (
      select distinct on (c.user_id, c.day)
             c.id, coalesce(p.name, '—') as name, c.day, c.status, c.path, c.flag, c.reason,
             m.kind, dp.level, c.reviewed_at, c.created_at
      from public.checkins c
      left join public.profiles p      on p.id = c.user_id
      left join public.missions m      on m.day = c.day
      left join public.day_progress dp on dp.user_id = c.user_id and dp.day = c.day
      where public._is_review_visible(c.user_id) and c.path like '%/%'
      order by c.user_id, c.day, c.created_at desc
    ) x
  ), '[]'::json);
end; $$;

grant execute on function public.admin_list_photos() to authenticated;

-- Duyệt/gỡ: đánh dấu đã xem. Bấm "OK" trên ảnh AI đã duyệt thì GIỮ điểm AI (không ghi đè day_progress).
create or replace function public.admin_set_checkin_status(p_id uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c record; old_status text; pts numeric;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  select status into old_status from public.checkins where id = p_id for update;
  if not found then raise exception 'server'; end if;
  update public.checkins set status = p_status, reason = p_reason, reviewed_at = now()
    where id = p_id returning * into c;

  if p_status = 'approved' then
    if old_status <> 'approved' then
      select points into pts from public.missions where day = c.day;
      insert into public.day_progress (user_id, day, status, points)
        values (c.user_id, c.day, 'checked', coalesce(pts,0))
        on conflict (user_id, day) do update set status = 'checked', points = excluded.points;
    end if;
  elsif p_status = 'rejected' and old_status <> 'rejected' then
    insert into public.day_progress (user_id, day, status, points)
      values (c.user_id, c.day, 'rejected', 0)
      on conflict (user_id, day) do update set status = 'rejected', points = 0;
    insert into public.notifications (user_id, title, body)
      values (
        c.user_id,
        'Ảnh ngày ' || c.day || ' bị từ chối',
        coalesce(nullif(trim(p_reason), ''), 'Ảnh không hợp lệ, điểm ngày này đã bị gỡ. Vui lòng đăng lại ảnh hợp lệ nhé.')
      );
  end if;
end; $$;
