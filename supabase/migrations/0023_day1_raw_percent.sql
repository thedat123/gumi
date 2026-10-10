-- =====================================================================
-- Check-in đường: validate bằng % ĐƯỜNG THÔ (0-100) thay vì nấc rời rạc.
-- Lý do: AI đọc được số lẻ (vd 69%). Nếu làm tròn lên nấc 70 rồi so, một ly
-- 69% trên thói quen 70% sẽ bị chặn oan. Nay so bằng số thật để khớp y hệt AI.
--
-- LUẬT:
--   • Ngày 1 "Bước nhỏ đầu tiên": chỉ cần THẤP HƠN thói quen đăng ký (giảm bất kỳ) → đạt.
--   • Ngày 5 ≤ 50%, Ngày 15 ≤ 30%, Ngày 20 = 0%.
--   • p_level (nấc rời rạc) VẪN được lưu để tính điểm/sugarCut.
--   • p_sugar_percent null (client cũ) → fallback dùng nấc như trước.
--
-- Gộp mọi overload cũ (3/4 tham số) về MỘT bản 5 tham số để tránh PostgREST nhập nhằng.
-- =====================================================================

drop function if exists public.submit_checkin(int, int, text);
drop function if exists public.submit_checkin(int, int, text, boolean);

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
  if pct is not null and (pct < 0 or pct > 100) then pct := null; end if; -- % lạ → bỏ, dùng nấc

  if pct is not null then
    -- So bằng % THÔ (khớp y hệt AI, vd 69% vẫn hợp lệ).
    if p_day = 1 then
      select level into baseline from public.profiles where id = uid;
      if pct >= baseline then raise exception 'level_not_allowed'; end if;
    elsif p_day = 5  and pct > 50 then raise exception 'level_not_allowed';
    elsif p_day = 15 and pct > 30 then raise exception 'level_not_allowed';
    elsif p_day = 20 and pct > 0  then raise exception 'level_not_allowed';
    end if;
  else
    -- Fallback client cũ: dùng nấc rời rạc.
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
