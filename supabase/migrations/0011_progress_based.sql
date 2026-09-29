-- =====================================================================
-- Level Down Challenge — TIẾN TRÌNH THEO CHẶNG HOÀN THÀNH (không theo lịch)
-- =====================================================================
-- Thay đổi bản chất so với 0010 (vốn tính (hôm nay − ngày tạo TK) + 1):
--   • "Chặng đang mở" = SỐ CHẶNG ĐÃ HOÀN THÀNH + 1. Xong màn 1 → màn kế là 2,
--     bất kể nghỉ bao nhiêu ngày. KHÔNG nhảy cóc theo lịch.
--   • Mỗi NGÀY (giờ VN) chỉ hoàn thành ĐÚNG MỘT chặng. Xong hôm nay → chặng kế
--     khoá tới ngày mai. (Ví dụ: xong màn 1 ngày 1, nghỉ ngày 2, ngày 3 mở màn 2.)
--   • Nghỉ ngày không bị tính "lỡ"/không mất chặng — quay lại đúng chặng dang dở.
--
-- Toàn bộ dùng CREATE OR REPLACE → chạy lại nhiều lần vẫn an toàn (idempotent).
-- =====================================================================

-- ---------- Helpers tiến trình --------------------------------------

-- Số chặng đã hoàn thành (checked/passed). Vì mọi submit đều bị chốt vào đúng
-- chặng đang mở nên tập hoàn thành luôn liên tục 1..k → count = chặng cao nhất đã xong.
create or replace function public._done_count(p_uid uuid) returns int
language sql stable set search_path = public, pg_temp as $$
  select count(*)::int from public.day_progress
  where user_id = p_uid and status in ('checked', 'passed');
$$;

-- Hôm nay (giờ VN) người dùng đã hoàn thành một chặng chưa? (chốt "mỗi ngày 1 chặng")
create or replace function public._done_today(p_uid uuid) returns boolean
language sql stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.day_progress
    where user_id = p_uid and status in ('checked', 'passed')
      and (created_at at time zone 'Asia/Ho_Chi_Minh')::date = public._today_vn()
  );
$$;

-- Chặng ĐANG CHƠI ĐƯỢC ngay bây giờ, hoặc 0 nếu không có (đã xong hôm nay / đã hết 21 chặng).
create or replace function public._playable_day() returns int
language sql stable set search_path = public, pg_temp as $$
  select case
    when public._done_count(auth.uid()) >= 21 then 0
    when public._done_today(auth.uid())      then 0
    else public._done_count(auth.uid()) + 1
  end;
$$;

-- Con trỏ hiển thị của hành trình:
--   • Đã xong hết 21 chặng → 22 (kết thúc).
--   • Hôm nay đã xong một chặng → trỏ vào chặng vừa xong (chờ mai mở chặng kế).
--   • Còn chơi được → trỏ vào chặng kế tiếp (= số chặng đã xong + 1).
create or replace function public._campaign_day() returns int
language sql stable set search_path = public, pg_temp as $$
  select case
    when public._done_count(auth.uid()) >= 21 then 22
    when public._done_today(auth.uid())      then greatest(public._done_count(auth.uid()), 1)
    else public._done_count(auth.uid()) + 1
  end;
$$;

-- ---------- Trạng thái hành trình ------------------------------------
create or replace function public.get_campaign_state() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare has_profile boolean; sd date; d int;
begin
  select exists (select 1 from public.profiles where id = auth.uid()) into has_profile;
  if not has_profile then
    -- Khách chưa đăng nhập / chưa tạo hồ sơ: hành trình luôn sẵn sàng để bắt đầu.
    return json_build_object('phase', 'running', 'day', 0,
                             'startDate', to_char(public._today_vn(), 'YYYY-MM-DD'));
  end if;

  select (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date into sd
  from public.profiles p where p.id = auth.uid();
  d := public._campaign_day();

  return json_build_object(
    'phase', case when d > 21 then 'ended' else 'running' end,
    'day', least(greatest(d, 1), 21),
    'startDate', to_char(coalesce(sd, public._today_vn()), 'YYYY-MM-DD')
  );
end; $$;

-- ---------- Hành trình (Dashboard) -----------------------------------
create or replace function public.get_my_journey() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  op  int  := public._playable_day();   -- chặng đang mở (0 = không có)
  cday int := public._campaign_day();
  unlocked boolean := public._is_tester() or public._is_admin();  -- test/admin: mở hết mọi chặng
  days text[] := array[]::text[];
  d int; ast text; st text;
  points numeric; streak int; passes int; rej text;
begin
  if uid is null then raise exception 'forbidden'; end if;

  for d in 1..21 loop
    select status into ast from public.day_progress where user_id = uid and day = d;
    if ast in ('checked', 'passed', 'rejected') then
      st := ast;                          -- giữ nguyên chặng đã hoàn thành / bị gỡ
    elsif unlocked then
      st := 'open';                       -- test/admin: mọi chặng chưa làm đều mở
    elsif op > 0 and d = op then
      st := 'open';                       -- chặng đang chơi được hôm nay (kể cả retry sau khi bị gỡ ảnh)
    else
      st := 'future';                     -- chưa tới hoặc chưa mở (khoá tới khi hoàn thành chặng trước)
    end if;
    days := array_append(days, st);
  end loop;

  points := public._total_points(uid);
  streak := public._streak(uid);
  select passes_left into passes from public.profiles where id = uid;
  select coalesce(nullif(trim(c.reason), ''), 'ảnh không hợp lệ') into rej
  from public.day_progress dp
  left join public.checkins c
    on c.user_id = dp.user_id and c.day = dp.day and c.status = 'rejected'
  where dp.user_id = uid and dp.status = 'rejected'
  order by dp.day desc limit 1;

  return json_build_object(
    'phase', case when unlocked then 'running' when cday > 21 then 'ended' else 'running' end,
    'day', least(greatest(cday, 1), 21),
    'days', to_json(days),
    'totalPoints', points,
    'streak', streak,
    'rank', public._rank_for(points),
    'passAvailable', coalesce(passes, 0) > 0,
    'passesLeft', coalesce(passes, 0),
    'passHoursLeft', null,
    'gumi', case when days[21] = 'checked' then 'tien_hoa' else 'bo_pho' end,
    'rejectedReason', rej
  );
end; $$;

-- ---------- Check-in ảnh (DRINK/SHARE) -------------------------------
-- Chỉ cho nộp ĐÚNG chặng đang mở, và mỗi ngày một chặng (op=0 khi đã xong hôm nay).
create or replace function public.submit_checkin(p_day int, p_level int, p_path text)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); mk text; pts numeric; needs boolean;
        unlocked boolean := public._is_tester() or public._is_admin();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and (op = 0 or p_day <> op) then raise exception 'not_today'; end if;
  select kind, points, needs_level into mk, pts, needs from public.missions where day = p_day;
  if mk is null or mk not in ('DRINK', 'SHARE') then raise exception 'not_today'; end if;
  if needs and p_level not in (70, 50, 30, 0) then raise exception 'level_not_allowed'; end if;

  insert into public.checkins (user_id, day, path, status) values (uid, p_day, p_path, 'approved');
  insert into public.day_progress (user_id, day, status, points, level)
    values (uid, p_day, 'checked', pts, case when needs then p_level else null end)
    on conflict (user_id, day) do update
      set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();

  return json_build_object('ok', true, 'points', pts);
end; $$;

-- ---------- Mini-game / KNOW / boss ---------------------------------
create or replace function public.submit_minigame(p_day int)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); mk text; pts numeric;
        unlocked boolean := public._is_tester() or public._is_admin();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and (op = 0 or p_day <> op) then raise exception 'not_today'; end if;
  select kind, points into mk, pts from public.missions where day = p_day;
  if mk is null or p_day = 2 or mk not in ('GAME', 'KNOW', 'FINAL') then raise exception 'server'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, p_day, 'checked', coalesce(pts, 0))
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();
  return json_build_object('ok', true, 'points', coalesce(pts, 0));
end; $$;

-- ---------- Quiz Ngày 2 (chặng 2) -----------------------------------
create or replace function public.submit_quiz(p_guesses jsonb) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day();
        unlocked boolean := public._is_tester() or public._is_admin();
        q record; g numeric; pt numeric; total numeric := 0; items jsonb := '[]'::jsonb; mx numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and op <> 2 then raise exception 'not_today'; end if;   -- quiz chỉ là chặng 2
  for q in select id, drink, answer from public.quiz_questions order by id loop
    g  := coalesce((p_guesses ->> q.id::text)::numeric, 0);
    pt := round(greatest(0, 2 - abs(g - q.answer) * 0.4) * 10) / 10;
    total := total + pt;
    items := items || jsonb_build_object('id', q.id, 'guess', g, 'answer', q.answer, 'points', pt);
  end loop;
  total := round(total * 10) / 10;
  select count(*) * 2 into mx from public.quiz_questions;

  insert into public.quiz_results (user_id, score, max, items) values (uid, total, mx, items)
    on conflict (user_id) do update set score = excluded.score, max = excluded.max, items = excluded.items, created_at = now();
  insert into public.day_progress (user_id, day, status, points) values (uid, 2, 'checked', total)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();

  return json_build_object('score', total, 'max', mx, 'items', items);
end; $$;

-- ---------- Bùa Hồi Sinh — bỏ qua chặng hôm nay mà vẫn tiến ----------
-- Đánh dấu chặng đang mở là 'passed' (tính như đã hoàn thành, tốn 1 bùa).
create or replace function public.use_sugar_pass() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); left_ int;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if op = 0 then raise exception 'not_today'; end if;
  select passes_left into left_ from public.profiles where id = uid;
  if coalesce(left_, 0) <= 0 then raise exception 'no_pass'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, op, 'passed', 0)
    on conflict (user_id, day) do update set status = 'passed', points = 0, created_at = now();
  update public.profiles set passes_left = passes_left - 1 where id = uid;
end; $$;

-- ---------- Quyền chạy RPC ------------------------------------------
grant execute on all functions in schema public to authenticated;
grant execute on function public.get_campaign_state() to anon;
