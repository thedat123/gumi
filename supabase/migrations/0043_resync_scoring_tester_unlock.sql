-- Production đang chạy lẫn bản cũ: missions vẫn là bố cục 21 ngày (day 5 = DRINK, 6 = GAME, 8 = SHARE)
-- và submit_quiz là bản chấm 0–2 điểm theo độ lệch. Hậu quả:
--   • Ngày 2 đoán sai được 0 điểm (đúng phải là +2 an ủi).
--   • Ngày 5, 8 (game) bị từ chối 'server'; ngày 6 (check-in) bị từ chối 'not_today'.
-- Migration này đồng bộ lại tất cả, và mở hết quyền cho tester/admin:
-- chơi ngày nào cũng được, lúc nào cũng được, bấm là lưu (chơi lại thì ghi đè).

-- 1) Bảng missions khớp vi.ts (14 ngày) --------------------------------
insert into public.missions (day, kind, title, points, needs_level) values
  (1,  'DRINK', 'Bước Nhỏ Đầu Tiên',               15, true),
  (2,  'KNOW',  'Đoán Thìa Đoán Muỗng',            10, false),
  (3,  'GAME',  'Đuổi Hình Bắt Chữ',               15, false),
  (4,  'SHARE', 'Khoe Ly Cùng Gumi',               20, false),
  (5,  'GAME',  'Đấu Trường Calo',                 20, false),
  (6,  'DRINK', 'Hạ Bậc Chạm Mốc 70% Đường',       20, true),
  (7,  'GAME',  'Flappy Gumi',                     20, false),
  (8,  'KNOW',  'Trắc Nghiệm Chớp Nhoáng',         30, false),
  (9,  'GAME',  'Truy Tìm Mật Khẩu',               50, false),
  (10, 'DRINK', 'DIY Drink',                       20, false),
  (11, 'GAME',  'Gumi Bắt Chữ',                    40, false),
  (12, 'GAME',  'Lật Thẻ Trí Nhớ',                 60, false),
  (13, 'SHARE', 'Mẹo Nhỏ Cắt Đường',               20, false),
  (14, 'FINAL', 'Hứng Nước & Lời Nhắn Tốt Nghiệp', 25, false)
on conflict (day) do update set kind = excluded.kind, title = excluded.title,
  points = excluded.points, needs_level = excluded.needs_level;

-- 2) Quiz ngày 2: đúng (12–15 thìa) +10, sai +2 --------------------------
create or replace function public.submit_quiz(p_guesses jsonb) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day();
        unlocked boolean := public._is_tester() or public._is_admin();
        q record; g numeric; pt numeric; total numeric := 0; items jsonb := '[]'::jsonb; mx numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and op <> 2 then raise exception 'not_today'; end if;
  for q in select id, answer from public.quiz_questions order by id loop
    g := coalesce((p_guesses ->> q.id::text)::numeric, 0);
    pt := case when g between 12 and 15 then 10 else 2 end;
    total := total + pt;
    items := items || jsonb_build_object('id', q.id, 'guess', g, 'answer', q.answer, 'points', pt);
  end loop;
  select count(*) * 10 into mx from public.quiz_questions;
  insert into public.quiz_results (user_id, score, max, items) values (uid, total, mx, items)
    on conflict (user_id) do update set score = excluded.score, max = excluded.max, items = excluded.items, created_at = now();
  insert into public.day_progress (user_id, day, status, points) values (uid, 2, 'checked', total)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();
  return json_build_object('score', total, 'max', mx, 'items', items);
end; $$;

-- Chấm lại kết quả quiz đã lưu theo luật mới (dựa vào số đoán của câu id 0).
with fixed as (
  select user_id,
         case when (items -> 0 ->> 'guess')::numeric between 12 and 15 then 10 else 2 end as pts,
         coalesce((items -> 0 ->> 'guess')::numeric, 0) as g
  from public.quiz_results
)
update public.quiz_results q
   set score = f.pts, max = 10,
       items = jsonb_build_array(jsonb_build_object('id', 0, 'guess', f.g, 'answer', 13, 'points', f.pts))
  from fixed f where f.user_id = q.user_id;

update public.day_progress dp set points = q.score
  from public.quiz_results q
 where dp.user_id = q.user_id and dp.day = 2 and dp.status = 'checked';

-- 3) Game có điểm theo kết quả (ngày 5, 7, 8, 11, 12) -------------------
--    Người chơi thường: idempotent (đã lưu thì trả lại điểm cũ).
--    Tester/admin: ngày nào cũng được, chơi lại thì ghi đè điểm mới.
create or replace function public.submit_minigame_score(p_day int, p_points numeric)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid(); op int; mk text; saved_pts numeric; valid boolean;
  unlocked boolean := public._is_tester() or public._is_admin();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked then
    select points into saved_pts from public.day_progress
      where user_id = uid and day = p_day and status = 'checked';
    if found then return json_build_object('ok', true, 'points', saved_pts); end if;
    op := public._playable_day();
    if op = 0 or p_day <> op then raise exception 'not_today'; end if;
  end if;
  select kind into mk from public.missions where day = p_day;
  if mk is null or mk not in ('GAME', 'KNOW', 'FINAL') or p_day = 2 then raise exception 'server'; end if;
  valid := case
    when p_day = 5  then p_points in (0, 10, 20)
    when p_day = 7  then p_points in (20, 50, 100)
    when p_day = 8  then p_points between 0 and 30 and p_points::int % 10 = 0
    when p_day = 11 then p_points between 0 and 40 and p_points::int % 5  = 0
    when p_day = 12 then p_points between 0 and 60 and p_points::int % 10 = 0
    else unlocked and p_points between 0 and 100 end;
  if not valid then raise exception 'server'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, p_day, 'checked', p_points)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();
  return json_build_object('ok', true, 'points', p_points);
end; $$;
grant execute on function public.submit_minigame_score(int, numeric) to authenticated;

-- 4) Game điểm cố định: luôn idempotent (không ghi đè điểm thật đã lưu),
--    tester/admin bỏ qua chặn ngày.
create or replace function public.submit_minigame(p_day int)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid(); op int; mk text; pts numeric; saved_pts numeric;
  unlocked boolean := public._is_tester() or public._is_admin();
begin
  if uid is null then raise exception 'forbidden'; end if;
  select points into saved_pts from public.day_progress
    where user_id = uid and day = p_day and status = 'checked';
  if found then return json_build_object('ok', true, 'points', saved_pts); end if;
  select kind, points into mk, pts from public.missions where day = p_day;
  if mk is null or p_day = 2 or mk not in ('GAME', 'KNOW', 'FINAL') then raise exception 'server'; end if;
  if not unlocked then
    op := public._playable_day();
    if op = 0 or p_day <> op then raise exception 'not_today'; end if;
  end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, p_day, 'checked', coalesce(pts, 0))
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();
  return json_build_object('ok', true, 'points', coalesce(pts, 0));
end; $$;
grant execute on function public.submit_minigame(int) to authenticated;

-- 5) Check-in ảnh (DRINK/SHARE). Tester/admin: ngày nào cũng được, nộp lại thì ghi đè.
drop function if exists public.submit_checkin(integer, integer, text);

create or replace function public.submit_checkin(
  p_day int, p_level int, p_path text,
  p_needs_review boolean default false,
  p_sugar_percent numeric default null
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid(); play_day int; mk text; pts numeric; needs boolean;
  unlocked boolean := public._is_tester() or public._is_admin();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked then
    play_day := public._playable_day();
    if play_day = 0 or p_day <> play_day then raise exception 'not_today'; end if;
  end if;
  select kind, points, needs_level into mk, pts, needs from public.missions where day = p_day;
  if mk is null or mk not in ('DRINK', 'SHARE') then raise exception 'not_today'; end if;
  if not unlocked and exists (select 1 from public.day_progress
      where user_id = uid and day = p_day and status in ('checked', 'passed'))
    then raise exception 'already_done'; end if;
  if needs and p_level not in (70, 50, 30, 0) then raise exception 'level_not_allowed'; end if;

  insert into public.checkins (user_id, day, path, status) values (uid, p_day, p_path, 'approved');
  insert into public.day_progress (user_id, day, status, points, level)
    values (uid, p_day, 'checked', pts, case when needs then p_level else null end)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points,
      level = excluded.level, created_at = now();

  return json_build_object('ok', true, 'points', pts);
end; $$;
grant execute on function public.submit_checkin(int, int, text, boolean, numeric) to authenticated;
