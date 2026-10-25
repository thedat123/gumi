-- Gửi thử nhắc nhở cho đúng 1 tài khoản (GitHub Actions → "Push reminders" → ô test_email).
-- Edge Function send-reminders (chế độ testEmail, chỉ service role gọi được) dùng hàm này để tìm người nhận.

-- Trả về người dùng theo email, BỎ QUA lịch/cài đặt nhận email (để admin/tester tự test).
create or replace function public.reminder_test_target(p_email text)
returns table(user_id uuid, email text, name text, campaign_day int)
language sql security definer stable set search_path = public, pg_temp as $$
  select u.id, u.email, p.name, least(greatest(coalesce(public._day_of(u.id), 1), 1), 14)
  from auth.users u left join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;
revoke all on function public.reminder_test_target(text) from public, anon, authenticated;
grant execute on function public.reminder_test_target(text) to service_role;
