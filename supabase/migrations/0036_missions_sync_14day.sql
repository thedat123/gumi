-- Đồng bộ bảng missions với nội dung vi.ts cho hành trình 14 ngày.
-- Nhiều ngày bị sai kind/points/needs_level do missions table chưa được cập nhật
-- khi campaign được redesign từ 21 → 14 ngày.

-- Day 5: DRINK (Chạm Mốc 50%) → GAME (Đấu Trường Calo/SortGame)
UPDATE public.missions SET kind='GAME', points=20, title='Đấu Trường Calo', needs_level=false WHERE day=5;

-- Day 6: GAME (Đấu Trường Calo) → DRINK (Hạ Bậc Chạm Mốc 70% Đường)
UPDATE public.missions SET kind='DRINK', points=20, title='Hạ Bậc Chạm Mốc 70% Đường', needs_level=true WHERE day=6;

-- Day 7: GAME 30pts (Bay Qua Cơn Thèm) → GAME 20pts (Flappy Gumi)
UPDATE public.missions SET points=20, title='Flappy Gumi' WHERE day=7;

-- Day 8: SHARE 20pts (Buddy Challenge) → KNOW 30pts (Trắc Nghiệm Chớp Nhoáng)
-- Đây là nguyên nhân trực tiếp "ko tổng hợp đc điểm": kind=SHARE bị submit_minigame_score từ chối.
UPDATE public.missions SET kind='KNOW', points=30, title='Trắc Nghiệm Chớp Nhoáng' WHERE day=8;

-- Day 10: DRINK 15pts (Nói Không Với Topping Ngọt) → DRINK 20pts (DIY Drink), không cần level
UPDATE public.missions SET points=20, title='DIY Drink', needs_level=false WHERE day=10;

-- Day 11: KNOW 10pts (Vạch Mặt Đường Ẩn) → GAME 40pts (Gumi Bắt Chữ / Crossword)
-- 8 từ × 5 điểm = tối đa 40 (khớp validate submit_minigame_score)
UPDATE public.missions SET kind='GAME', points=40, title='Gumi Bắt Chữ' WHERE day=11;

-- Day 13: giữ SHARE 20pts, chỉ đổi title cho khớp vi.ts
UPDATE public.missions SET title='Mẹo Nhỏ Cắt Đường' WHERE day=13;

-- Day 14: GAME 10pts (Đánh Bại Boss Đường) → FINAL 25pts (Hứng Nước & Lời Nhắn Tốt Nghiệp)
UPDATE public.missions SET kind='FINAL', points=25, title='Hứng Nước & Lời Nhắn Tốt Nghiệp' WHERE day=14;

-- Xóa days 15-21 (campaign chỉ 14 ngày)
DELETE FROM public.missions WHERE day > 14;

-- Day 12: 6 cặp (Glucose/Fructose/Sucrose/Maltose/Lactose/Sorbitol) → max 60pts; cập nhật submit_minigame_score validation
UPDATE public.missions SET points=60, title='Lật Thẻ Trí Nhớ' WHERE day=12;

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
