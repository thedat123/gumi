-- Fix: submit_minigame_score và submit_minigame trả về success ngay nếu ngày đó
-- đã được lưu (status='checked'). Ngăn retry-loop khi DB insert thành công nhưng
-- network fail trước khi client nhận response → lần retry: _done_today()=true →
-- _playable_day()=0 → not_today → client mãi báo "Chưa lưu được điểm".
-- Cũng đảm bảo missions day 5 = GAME (phòng trường hợp 0036 chưa apply).

UPDATE public.missions SET kind='GAME', points=20, title='Đấu Trường Calo', needs_level=false WHERE day=5;
UPDATE public.missions SET kind='KNOW', points=30, title='Trắc Nghiệm Chớp Nhoáng' WHERE day=8;
UPDATE public.missions SET points=60, title='Lật Thẻ Trí Nhớ' WHERE day=12;

CREATE OR REPLACE FUNCTION public.submit_minigame_score(p_day int, p_points numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  uid uuid := auth.uid(); op int; mk text;
  unlocked boolean; valid boolean := false;
  saved_pts numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  -- Idempotent: nếu đã lưu rồi (retry sau network fail), trả success ngay
  SELECT points INTO saved_pts FROM public.day_progress
    WHERE user_id = uid AND day = p_day AND status = 'checked';
  IF FOUND THEN RETURN json_build_object('ok', true, 'points', saved_pts); END IF;

  op       := public._playable_day();
  unlocked := public._is_tester() OR public._is_admin();
  IF NOT unlocked AND (op = 0 OR p_day <> op) THEN RAISE EXCEPTION 'not_today'; END IF;
  SELECT kind INTO mk FROM public.missions WHERE day = p_day;
  IF mk NOT IN ('GAME', 'KNOW') THEN RAISE EXCEPTION 'server'; END IF;
  valid := CASE
    WHEN p_day = 5  THEN p_points IN (0, 10, 20)
    WHEN p_day = 7  THEN p_points IN (20, 50, 100)
    WHEN p_day = 8  THEN p_points BETWEEN 0 AND 30  AND p_points::int % 10 = 0
    WHEN p_day = 11 THEN p_points BETWEEN 0 AND 40  AND p_points::int % 5  = 0
    WHEN p_day = 12 THEN p_points BETWEEN 0 AND 60  AND p_points::int % 10 = 0
    ELSE false END;
  IF NOT valid THEN RAISE EXCEPTION 'server'; END IF;
  INSERT INTO public.day_progress (user_id, day, status, points)
    VALUES (uid, p_day, 'checked', p_points)
    ON CONFLICT (user_id, day) DO UPDATE SET status = 'checked', points = EXCLUDED.points, created_at = now();
  RETURN json_build_object('ok', true, 'points', p_points);
END; $$;

CREATE OR REPLACE FUNCTION public.submit_minigame(p_day int)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  uid uuid := auth.uid(); op int; mk text; pts numeric;
  unlocked boolean;
  saved_pts numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  -- Idempotent: nếu đã lưu rồi (retry sau network fail), trả success ngay
  SELECT points INTO saved_pts FROM public.day_progress
    WHERE user_id = uid AND day = p_day AND status = 'checked';
  IF FOUND THEN RETURN json_build_object('ok', true, 'points', saved_pts); END IF;

  op       := public._playable_day();
  unlocked := public._is_tester() OR public._is_admin();
  SELECT kind, points INTO mk, pts FROM public.missions WHERE day = p_day;
  IF mk IS NULL OR p_day = 2 OR mk NOT IN ('GAME','KNOW','FINAL') THEN RAISE EXCEPTION 'server'; END IF;
  IF NOT unlocked AND (op = 0 OR p_day <> op) THEN RAISE EXCEPTION 'not_today'; END IF;
  INSERT INTO public.day_progress (user_id, day, status, points)
    VALUES (uid, p_day, 'checked', coalesce(pts,0))
    ON CONFLICT (user_id, day) DO UPDATE SET status = 'checked', points = EXCLUDED.points;
  RETURN json_build_object('ok', true, 'points', coalesce(pts,0));
END; $$;
