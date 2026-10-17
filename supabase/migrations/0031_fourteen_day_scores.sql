-- Validate điểm BIẾN THIÊN cho các màn bản 14 ngày (trước đây 0018 chỉ cho days 6/12/16/17/18/19).
--   Day 5  (Sort):      0 / 10 (xếp đúng lượt 2) / 20 (xếp đúng ngay)
--   Day 7  (Flappy):    mốc cao nhất đạt được → 20 / 50 / 100 cột
--   Day 8  (QuickQuiz): +10/câu đúng → 0..30 bước 10
--   Day 11 (Crossword): +5/câu (8 từ) → 0..40 bước 5
--   Day 12 (Memory):    +10/cặp (5 cặp) → 0..50 bước 10
-- Các ngày GAME khác (3 Đuổi hình, 9 Wordsearch) trao trọn điểm qua submit_minigame (không điểm).
create or replace function public.submit_minigame_score(p_day int, p_points int)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); mk text;
        unlocked boolean := public._is_tester() or public._is_admin();
        valid boolean := false;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and (op = 0 or p_day <> op) then raise exception 'not_today'; end if;
  select kind into mk from public.missions where day = p_day;
  if mk not in ('GAME', 'KNOW') then raise exception 'server'; end if;
  valid := case
    when p_day = 5  then p_points in (0, 10, 20)
    when p_day = 7  then p_points in (20, 50, 100)
    when p_day = 8  then p_points between 0 and 30 and p_points % 10 = 0
    when p_day = 11 then p_points between 0 and 40 and p_points % 5 = 0
    when p_day = 12 then p_points between 0 and 50 and p_points % 10 = 0
    else false end;
  if not valid then raise exception 'server'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, p_day, 'checked', p_points)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();
  return json_build_object('ok', true, 'points', p_points);
end; $$;

grant execute on function public.submit_minigame_score(int, int) to authenticated;
