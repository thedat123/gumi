-- =====================================================================
-- 0012 — Admin nhìn thấy LOẠI nhiệm vụ + MỨC ĐƯỜNG (AI đọc) trên từng ảnh.
-- Bổ sung 'kind' (từ missions) và 'level' (từ day_progress) vào 2 hàm liệt kê.
-- Idempotent (create or replace).
-- =====================================================================

create or replace function public.admin_list_checkins(p_day int) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', c.id, 'user', coalesce(p.name, '—'), 'day', c.day,
      'status', c.status, 'emoji', c.path, 'flag', c.flag,
      'kind', m.kind, 'level', dp.level
    ) order by c.created_at)
    from public.checkins c
    left join public.profiles p      on p.id = c.user_id
    left join public.missions m      on m.day = c.day
    left join public.day_progress dp on dp.user_id = c.user_id and dp.day = c.day
    where c.day = p_day
  ), '[]'::json);
end; $$;

create or replace function public.admin_list_flags() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', c.id, 'user', coalesce(p.name, '—'), 'day', c.day,
      'status', c.status, 'emoji', c.path, 'flag', c.flag,
      'kind', m.kind, 'level', dp.level
    ) order by c.created_at)
    from public.checkins c
    left join public.profiles p      on p.id = c.user_id
    left join public.missions m      on m.day = c.day
    left join public.day_progress dp on dp.user_id = c.user_id and dp.day = c.day
    where c.flag is not null
  ), '[]'::json);
end; $$;
