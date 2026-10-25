-- Nhắc nhở qua EMAIL (SMTP), cùng giờ với Web Push.
-- Thiết kế hàng đợi (outbox) để chạy ổn định trên production:
--   • send-reminders (cron mỗi phút) giành suất nhắc 1 lần/người/mốc/ngày (claim_push_slot) như cũ,
--     gửi push ngay, còn email thì GHI VÀO HÀNG ĐỢI email_outbox (không gửi trong lúc xét người).
--   • Cùng lần chạy đó, lấy 1 lô nhỏ trong hàng đợi để gửi (giới hạn số mail + thời gian), có thử lại
--     với độ trễ tăng dần; mail quá hạn (nhắc nhở cũ) thì bỏ, không gửi muộn.
--   • Lô được giành bằng FOR UPDATE SKIP LOCKED → 2 lần chạy chồng nhau không gửi trùng.
--   • Chỉ gửi tới email ĐÃ XÁC MINH của tài khoản người chơi (role 'player') còn bật nhận email.

alter table public.profiles add column if not exists email_reminders boolean not null default true;

-- 1) Hàng đợi email ---------------------------------------------------------
create table if not exists public.email_outbox (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  slot_date       date not null,
  slot_minute     int  not null,
  to_email        text not null,
  subject         text not null,
  html            text not null,
  text_body       text not null,
  headers         jsonb not null default '{}'::jsonb,
  status          text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'expired')),
  attempts        int  not null default 0,
  last_error      text,
  created_at      timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  locked_at       timestamptz,
  sent_at         timestamptz,
  unique (user_id, slot_date, slot_minute)
);
create index if not exists email_outbox_pending_idx on public.email_outbox (next_attempt_at) where status = 'pending';
create index if not exists email_outbox_sent_idx on public.email_outbox (sent_at) where status = 'sent';
alter table public.email_outbox enable row level security; -- không policy: chỉ service role đọc/ghi
revoke all on public.email_outbox from public, anon, authenticated;

-- 2) Người cần xét nhắc nhở (1 dòng / người) ---------------------------------
drop function if exists public.reminder_users();
create or replace function public.reminder_users()
returns table(user_id uuid, email text, name text, campaign_day int, phase text,
              last_play_date date, last_completed_date date)
language sql security definer stable set search_path = public, pg_temp as $$
  select
    p.id,
    case when p.email_reminders and p.role = 'player' and u.email_confirmed_at is not null
         then u.email end,
    p.name,
    d.cday,
    case when d.cday > 14 then 'ended' when d.cday < 1 then 'before' else 'running' end,
    p.last_play_date,
    (select max((dp.created_at at time zone 'Asia/Ho_Chi_Minh')::date)
       from public.day_progress dp where dp.user_id = p.id and dp.status = 'checked')
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join lateral (select public._day_of(p.id) as cday) d;
$$;
revoke all on function public.reminder_users() from public, anon, authenticated;
grant execute on function public.reminder_users() to service_role;

-- 3) Giành 1 lô để gửi --------------------------------------------------------
-- Dọn trước: mail chờ quá p_max_age thì 'expired' (nhắc nhở cũ không còn giá trị);
-- mail kẹt 'sending' quá 10 phút (lần chạy trước bị ngắt) thì trả lại hàng đợi.
create or replace function public.claim_email_batch(p_limit int, p_max_age interval default interval '2 hours')
returns setof public.email_outbox
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.email_outbox set status = 'expired', last_error = coalesce(last_error, 'quá hạn gửi')
   where status = 'pending' and created_at < now() - p_max_age;
  update public.email_outbox set status = 'pending', locked_at = null
   where status = 'sending' and locked_at < now() - interval '10 minutes';

  return query
  update public.email_outbox o
     set status = 'sending', attempts = o.attempts + 1, locked_at = now()
   where o.id in (
     select id from public.email_outbox
      where status = 'pending' and next_attempt_at <= now()
      order by id
      limit greatest(p_limit, 0)
      for update skip locked)
  returning o.*;
end; $$;
revoke all on function public.claim_email_batch(int, interval) from public, anon, authenticated;
grant execute on function public.claim_email_batch(int, interval) to service_role;

-- 4) Ghi kết quả gửi ------------------------------------------------------------
--   ok            → sent
--   p_retry=false → failed (lỗi vĩnh viễn: địa chỉ không tồn tại, nội dung bị từ chối…)
--   p_retry=true  → chờ thử lại: 2, 4, 8 phút…; hết p_max_attempts lần thì failed
--   p_requeue     → trả về hàng đợi KHÔNG tính lượt (vd chạm giới hạn gửi của Gmail)
--   p_disable     → tắt nhận email của người đó (địa chỉ chết), tránh làm xấu uy tín người gửi
create or replace function public.finish_email(
  p_id bigint, p_ok boolean, p_error text default null, p_retry boolean default true,
  p_requeue boolean default false, p_disable boolean default false, p_max_attempts int default 3
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.email_outbox;
begin
  select * into r from public.email_outbox where id = p_id for update;
  if not found then return; end if;
  if p_ok then
    update public.email_outbox set status = 'sent', sent_at = now(), locked_at = null, last_error = null where id = p_id;
  elsif p_requeue then
    update public.email_outbox set status = 'pending', attempts = greatest(r.attempts - 1, 0), locked_at = null,
           last_error = left(p_error, 500), next_attempt_at = now() + interval '15 minutes' where id = p_id;
  elsif p_retry and r.attempts < p_max_attempts then
    update public.email_outbox set status = 'pending', locked_at = null, last_error = left(p_error, 500),
           next_attempt_at = now() + make_interval(mins => (2 ^ r.attempts)::int) where id = p_id;
  else
    update public.email_outbox set status = 'failed', locked_at = null, last_error = left(p_error, 500) where id = p_id;
  end if;
  if p_disable then
    update public.profiles set email_reminders = false where id = r.user_id;
  end if;
end; $$;
revoke all on function public.finish_email(bigint, boolean, text, boolean, boolean, boolean, int) from public, anon, authenticated;
grant execute on function public.finish_email(bigint, boolean, text, boolean, boolean, boolean, int) to service_role;

-- 5) Số mail đã gửi hôm nay (giờ VN) — để chặn trần gửi/ngày của nhà cung cấp SMTP.
create or replace function public.emails_sent_today() returns int
language sql security definer stable set search_path = public, pg_temp as $$
  select count(*)::int from public.email_outbox
   where status = 'sent' and (sent_at at time zone 'Asia/Ho_Chi_Minh')::date = public._today_vn();
$$;
revoke all on function public.emails_sent_today() from public, anon, authenticated;
grant execute on function public.emails_sent_today() to service_role;

-- 6) Dọn lịch sử cũ (giữ 14 ngày để tra soát).
create or replace function public.purge_email_outbox() returns void
language sql security definer set search_path = public, pg_temp as $$
  delete from public.email_outbox where created_at < now() - interval '14 days';
$$;
revoke all on function public.purge_email_outbox() from public, anon, authenticated;
grant execute on function public.purge_email_outbox() to service_role;

-- 7) Bật/tắt nhận email (gọi từ trang huỷ nhận sau khi kiểm chữ ký link).
create or replace function public.set_email_reminders(p_user uuid, p_on boolean) returns void
language sql security definer set search_path = public, pg_temp as $$
  update public.profiles set email_reminders = p_on where id = p_user;
$$;
revoke all on function public.set_email_reminders(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_email_reminders(uuid, boolean) to service_role;
