-- Chặn người chơi tự ghi thẳng vào bảng profiles qua API.
-- Trước đây policy prof_ins/prof_upd cho phép sửa MỌI cột hồ sơ của chính mình (is_tester, passes_left,
-- created_at, play_streak…) và tạo hồ sơ với role tuỳ ý → tự thành tester/admin, né bảng xếp hạng,
-- Bùa vô hạn, dời Ngày 1. App chỉ GHI hồ sơ qua các RPC security definer (create_profile, update_profile,
-- mark_played, use_streak_freeze…) nên bỏ quyền ghi trực tiếp không ảnh hưởng app. Vẫn giữ quyền ĐỌC.

drop policy if exists prof_ins on public.profiles;
drop policy if exists prof_upd on public.profiles;
revoke insert, update, delete on public.profiles from anon, authenticated;
