-- =====================================================================
-- DUYỆT TAY CHO MỌI FLOW ĐĂNG ẢNH MXH (Story/Wall).
-- Yêu cầu: khi người chơi đăng ảnh lên Story/Wall → báo thành công NHƯNG
-- đẩy vào hàng chờ admin; admin có quyền TỪ CHỐI ảnh không hợp lệ →
-- trừ điểm ngày đó (0 điểm) + GỬI THÔNG BÁO cho người chơi kèm lý do.
--
-- Tái dùng pipeline duyệt tay sẵn có (bảng checkins status 'pending' + flag,
-- admin_list_flags, admin_set_checkin_status). Điểm ghi TẠM trong lúc chờ
-- để không mất chuỗi; từ chối mới trừ.
-- Idempotent: create or replace.
-- =====================================================================

-- 1) submit_checkin: ngày SHARE LUÔN đi nhánh duyệt tay (nguồn sự thật ở SQL,
--    chặn tester tự auto-approve). Giữ nguyên chữ ký 5 tham số của 0023.
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

  -- Đường thường (AI đã pass) — validate rồi auto-approve.
  if needs and p_level not in (70, 50, 30, 0) then raise exception 'level_not_allowed'; end if;
  if pct is not null and (pct < 0 or pct > 100) then pct := null; end if;

  if pct is not null then
    if p_day = 1 then
      select level into baseline from public.profiles where id = uid;
      if pct >= baseline then raise exception 'level_not_allowed'; end if;
    elsif p_day = 5  and pct > 50 then raise exception 'level_not_allowed';
    elsif p_day = 15 and pct > 30 then raise exception 'level_not_allowed';
    elsif p_day = 20 and pct > 0  then raise exception 'level_not_allowed';
    end if;
  else
    if p_day = 1 then
      select level into baseline from public.profiles where id = uid;
      max_level := case baseline when 100 then 70 when 70 then 50 when 50 then 30 else 0 end;
    elsif p_day = 5 then max_level := 50;
    elsif p_day = 15 then max_level := 30;
    elsif p_day = 20 then max_level := 0;
    end if;
    if max_level is not null and p_level > max_level then raise exception 'level_not_allowed'; end if;
  end if;

  insert into public.checkins (user_id, day, path, status) values (uid, p_day, p_path, 'approved');
  insert into public.day_progress (user_id, day, status, points, level)
    values (uid, p_day, 'checked', pts, case when needs then p_level else null end)
    on conflict (user_id, day) do update
      set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
  return json_build_object('ok', true, 'points', pts);
end; $$;

grant execute on function public.submit_checkin(int, int, text, boolean, int) to authenticated;

-- 2) submit_graduation: nếu CÓ ảnh Story minh chứng → đẩy vào hàng chờ admin
--    (checkins day 21, pending). Điểm vẫn ghi tạm; admin từ chối → trừ về 0.
--    Không ảnh (chỉ lời nhắn) → giữ nguyên như cũ, không cần duyệt ảnh.
create or replace function public.submit_graduation(p_text text, p_story_path text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); nm text;
        unlocked boolean := public._is_tester() or public._is_admin();
        earned int := case when p_story_path is null then 15 else 25 end;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and op <> 21 then raise exception 'not_today'; end if;
  if length(trim(coalesce(p_text, ''))) < 10 or length(trim(p_text)) > 200 then raise exception 'server'; end if;
  if p_story_path is not null and left(p_story_path, length(uid::text) + 1) <> (uid::text || '/') then
    raise exception 'forbidden';
  end if;
  select name into nm from public.profiles where id = uid;
  insert into public.wall_posts (user_id, name, text, story_path)
    values (uid, coalesce(nm, 'Bạn'), trim(p_text), p_story_path);
  insert into public.day_progress (user_id, day, status, points)
    values (uid, 21, 'checked', earned)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();

  -- Có ảnh Story → gửi admin duyệt tay (từ chối sẽ gỡ điểm ngày 21 + báo user).
  if p_story_path is not null then
    delete from public.checkins where user_id = uid and day = 21;
    insert into public.checkins (user_id, day, path, status, flag)
      values (uid, 21, p_story_path, 'pending', 'Tốt nghiệp — chờ duyệt');
  end if;
end; $$;

grant execute on function public.submit_graduation(text, text) to authenticated;

-- 3) admin_set_checkin_status: khi TỪ CHỐI → ngoài việc gỡ điểm, gửi THÔNG BÁO
--    cho người chơi kèm lý do để họ biết & đăng lại.
create or replace function public.admin_set_checkin_status(p_id uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c record; pts numeric;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.checkins set status = p_status, reason = p_reason where id = p_id returning * into c;
  if not found then raise exception 'server'; end if;

  if p_status = 'approved' then
    select points into pts from public.missions where day = c.day;
    insert into public.day_progress (user_id, day, status, points)
      values (c.user_id, c.day, 'checked', coalesce(pts,0))
      on conflict (user_id, day) do update set status = 'checked', points = excluded.points;
  elsif p_status = 'rejected' then
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

grant execute on function public.admin_set_checkin_status(uuid, text, text) to authenticated;
