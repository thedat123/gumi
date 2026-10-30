-- Bỏ nhắc nhở qua EMAIL (0047). Nhắc nhở chỉ còn Web Push + thông báo trong app.
-- Giữ cột profiles.email_reminders vì reminder_users() vẫn tham chiếu (vô hại).
drop function if exists public.claim_email_batch(int, interval);
drop function if exists public.finish_email(bigint, boolean, text, boolean, boolean, boolean, int);
drop function if exists public.emails_sent_today();
drop function if exists public.purge_email_outbox();
drop function if exists public.set_email_reminders(uuid, boolean);
drop table if exists public.email_outbox;
