-- ROOT CAUSE của "Chưa lưu được điểm":
-- submit_minigame_score tồn tại 2 overload:
--   (int, int)     — migration 0018/0031, CŨ, không có idempotent fix
--   (int, numeric) — migration 0036→0038, MỚI, có đầy đủ fix
-- PostgreSQL ưu tiên (int, int) khi client truyền integer → mọi fix từ 0036 trở đi đều bị bỏ qua.
-- Fix: DROP overload cũ, GRANT execute cho overload mới.

DROP FUNCTION IF EXISTS public.submit_minigame_score(int, int);

GRANT EXECUTE ON FUNCTION public.submit_minigame_score(int, numeric) TO authenticated;
