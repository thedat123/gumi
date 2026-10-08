-- =====================================================================
-- FLOW DUYỆT TAY (fallback): khi AI KHÔNG nhận diện được ảnh check-in,
-- người chơi có thể GỬI CHO ADMIN duyệt tay thay vì bị kẹt.
-- =====================================================================
-- submit_checkin thêm tham số p_needs_review:
--   • true  → ghi checkin status 'pending' + flag để admin xem (admin_list_flags / admin_list_checkins);
--             vẫn ghi nhận TẠM THỜI (day_progress = 'checked' + điểm) để KHÔNG mất chuỗi trong lúc chờ.
--             Admin duyệt (giữ nguyên) hoặc từ chối (→ 'rejected', 0 điểm) qua admin_set_checkin_status.
--   • false → đường AI đã pass: validate mức đường & auto-approve như cũ.
-- Tham số có default = false → mọi lời gọi cũ (3 tham số) vẫn chạy bình thường.
-- Idempotent: create or replace.

create or replace function public.submit_checkin(p_day int, p_level int, p_path text, p_needs_review boolean default false)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); mk text; pts numeric; needs boolean;
        baseline int; max_level int;
        unlocked boolean := public._is_tester() or public._is_admin();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and (op = 0 or p_day <> op) then raise exception 'not_today'; end if;
  select kind, points, needs_level into mk, pts, needs from public.missions where day = p_day;
  if mk is null or mk not in ('DRINK', 'SHARE') then raise exception 'not_today'; end if;

  if p_needs_review then
    -- Một ảnh / ngày: xoá bản cũ rồi ghi pending + flag cho admin.
    delete from public.checkins where user_id = uid and day = p_day;
    insert into public.checkins (user_id, day, path, status, flag)
      values (uid, p_day, p_path, 'pending', 'AI chưa nhận diện — chờ duyệt tay');
    insert into public.day_progress (user_id, day, status, points, level)
      values (uid, p_day, 'checked', pts, case when needs and p_level in (70,50,30,0) then p_level else null end)
      on conflict (user_id, day) do update
        set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
    return json_build_object('ok', true, 'points', pts, 'pending', true);
  end if;

  -- Đường thường (AI đã pass) — validate mức đường rồi auto-approve.
  if needs and p_level not in (70, 50, 30, 0) then raise exception 'level_not_allowed'; end if;
  if p_day = 1 then
    select level into baseline from public.profiles where id = uid;
    max_level := case baseline when 100 then 70 when 70 then 50 when 50 then 30 else 0 end;
  elsif p_day = 5 then max_level := 50;
  elsif p_day = 15 then max_level := 30;
  elsif p_day = 20 then max_level := 0;
  end if;
  if max_level is not null and p_level > max_level then raise exception 'level_not_allowed'; end if;

  insert into public.checkins (user_id, day, path, status) values (uid, p_day, p_path, 'approved');
  insert into public.day_progress (user_id, day, status, points, level)
    values (uid, p_day, 'checked', pts, case when needs then p_level else null end)
    on conflict (user_id, day) do update
      set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
  return json_build_object('ok', true, 'points', pts);
end; $$;
