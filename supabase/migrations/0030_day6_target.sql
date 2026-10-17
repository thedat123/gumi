-- Ngày 6: thêm mốc "tối đa 70% đường" (trước đây không gate). Chỉ chặn khi AI đọc được % trên tem.
create or replace function public.submit_checkin(
  p_day int, p_level int, p_path text,
  p_needs_review boolean default false,
  p_sugar_percent int default null
)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); mk text; pts numeric; needs boolean;
        baseline int; max_level int; pct int := p_sugar_percent;
        unlocked boolean := public._is_tester() or public._is_admin();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and (op = 0 or p_day <> op) then raise exception 'not_today'; end if;
  select kind, points, needs_level into mk, pts, needs from public.missions where day = p_day;
  if mk is null or mk not in ('DRINK', 'SHARE') then raise exception 'not_today'; end if;

  -- Ngày SHARE (đăng ảnh MXH): LUÔN gửi admin duyệt tay, ghi điểm tạm, chờ duyệt.
  if mk = 'SHARE' then
    delete from public.checkins where user_id = uid and day = p_day;
    insert into public.checkins (user_id, day, path, status, flag)
      values (uid, p_day, p_path, 'pending', 'Đăng MXH — chờ duyệt');
    insert into public.day_progress (user_id, day, status, points, level)
      values (uid, p_day, 'checked', pts, null)
      on conflict (user_id, day) do update
        set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
    return json_build_object('ok', true, 'points', pts, 'pending', true);
  end if;

  if p_needs_review then
    delete from public.checkins where user_id = uid and day = p_day;
    insert into public.checkins (user_id, day, path, status, flag)
      values (uid, p_day, p_path, 'pending', 'AI chưa nhận diện — chờ duyệt tay');
    insert into public.day_progress (user_id, day, status, points, level)
      values (uid, p_day, 'checked', pts, case when needs and p_level in (70,50,30,0) then p_level else null end)
      on conflict (user_id, day) do update
        set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
    return json_build_object('ok', true, 'points', pts, 'pending', true);
  end if;

  -- Đường thường (AI đã pass) — validate mức đường cho ngày 1, 6 & 10, rồi auto-approve.
  if needs and p_level not in (70, 50, 30, 0) then raise exception 'level_not_allowed'; end if;
  if pct is not null and (pct < 0 or pct > 100) then pct := null; end if;

  if p_day = 1 then
    select level into baseline from public.profiles where id = uid;
    if pct is not null then
      if pct >= baseline then raise exception 'level_not_allowed'; end if;     -- phải thấp hơn thói quen
    else
      max_level := case baseline when 100 then 70 when 70 then 50 when 50 then 30 else 0 end;
      if p_level > max_level then raise exception 'level_not_allowed'; end if;
    end if;
  elsif p_day = 6 then
    if pct is not null then
      if pct > 70 then raise exception 'level_not_allowed'; end if;            -- tối đa 70% đường
    end if;
  elsif p_day = 10 then
    if pct is not null then
      if pct > 0 then raise exception 'level_not_allowed'; end if;             -- DIY: 0% đường
    elsif p_level > 0 then raise exception 'level_not_allowed';
    end if;
  end if;

  insert into public.checkins (user_id, day, path, status) values (uid, p_day, p_path, 'approved');
  insert into public.day_progress (user_id, day, status, points, level)
    values (uid, p_day, 'checked', pts, case when needs then p_level else null end)
    on conflict (user_id, day) do update
      set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
  return json_build_object('ok', true, 'points', pts);
end; $$;

grant execute on function public.submit_checkin(int, int, text, boolean, int) to authenticated;
