-- Day 12: đúng 6 cặp (Glucose/Fructose/Sucrose/Maltose/Lactose/Sorbitol), max 60 điểm.
-- Correction from 0036 which incorrectly set 7 pairs / 70pts.

UPDATE public.missions SET points=60 WHERE day=12;

CREATE OR REPLACE FUNCTION public.submit_minigame_score(p_day int, p_points numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  uid uuid := auth.uid(); op int := public._playable_day(); mk text;
  unlocked boolean := public._is_tester() OR public._is_admin();
  valid boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
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
