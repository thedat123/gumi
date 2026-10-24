-- Lịch gọi Edge Function `send-reminders` MỖI PHÚT bằng pg_cron + pg_net.
-- Chạy MỘT LẦN trong SQL Editor của Supabase (chứa URL + service key → KHÔNG commit giá trị thật).
-- Dùng Vault để không lộ khoá trong định nghĩa cron.

-- 1) Bật extension (Supabase thường đã có sẵn trong schema `extensions`).
create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;

-- 2) Lưu URL function + service role key vào Vault (thay <ref> và <SERVICE_ROLE_KEY>).
--    Lấy service role key ở: Project Settings → API → service_role (secret).
-- Provision these secrets once using vault.create_secret (or update_secret on rotation).
-- Do not run with placeholders; keep the service key outside version control.
-- Required: send_reminders_url = https://<ref>.supabase.co/functions/v1/send-reminders
-- Required: send_reminders_key = project's service_role JWT
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'send_reminders_url')
     or not exists (select 1 from vault.decrypted_secrets where name = 'send_reminders_key') then
    raise exception 'Provision send_reminders_url and send_reminders_key in Vault before scheduling';
  end if;
end $$;

-- 3) Đặt lịch mỗi phút. Gỡ lịch cũ trùng tên trước cho idempotent.
select cron.unschedule('send-reminders') where exists (select 1 from cron.job where jobname = 'send-reminders');
select cron.schedule('send-reminders', '* * * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'send_reminders_url'),
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'send_reminders_key')
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
$$);

-- Kiểm tra:  select * from cron.job;
-- Lịch sử:   select * from cron.job_run_details order by start_time desc limit 20;
-- Gỡ lịch:   select cron.unschedule('send-reminders');
