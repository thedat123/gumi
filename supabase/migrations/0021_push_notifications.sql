-- =====================================================================
-- Level Down Challenge — WEB PUSH (thông báo đẩy ra khay HĐH, kể cả khi ĐÓNG app)
-- =====================================================================
-- Kiến trúc:
--   • Trình duyệt subscribe push → lưu endpoint/khoá vào push_subscriptions (qua RPC).
--   • Edge Function `send-reminders` chạy mỗi phút (pg_cron gọi) → lấy user tới giờ nhắc
--     bằng reminder_targets(), chống gửi trùng bằng claim_push_slot(), rồi đẩy Web Push.
--   • reminder_targets() & claim_push_slot() CHỈ cho service_role gọi (từ edge function).
-- Idempotent: dùng create ... if not exists / create or replace → chạy lại an toàn.
-- =====================================================================

-- ---------- Bảng subscription ----------------------------------------
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
-- Người dùng chỉ THẤY/XOÁ subscription của chính mình; GHI đi qua RPC security definer.
drop policy if exists push_sub_select_own on public.push_subscriptions;
create policy push_sub_select_own on public.push_subscriptions for select using (user_id = auth.uid());
drop policy if exists push_sub_delete_own on public.push_subscriptions;
create policy push_sub_delete_own on public.push_subscriptions for delete using (user_id = auth.uid());

-- ---------- Nhật ký chống gửi TRÙNG (mỗi mốc nhắc/ngày/user gửi 1 lần) --
create table if not exists public.push_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  vn_date date not null,
  minute  int  not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, vn_date, minute)
);
-- Dọn log cũ (giữ 14 ngày) — gọi kèm trong edge function hoặc cron riêng.
create or replace function public.purge_push_log() returns void
language sql security definer set search_path = public, pg_temp as $$
  delete from public.push_log where vn_date < public._today_vn() - 14;
$$;
revoke all on function public.purge_push_log() from public;
grant execute on function public.purge_push_log() to service_role;

-- ---------- RPC cho CLIENT: lưu / xoá subscription ---------------------
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_ua text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  insert into public.push_subscriptions(endpoint, user_id, p256dh, auth, user_agent, updated_at)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, p_ua, now())
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, updated_at = now();
end; $$;

create or replace function public.delete_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end; $$;

grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- ---------- RPC cho SERVER (service_role): ai tới giờ nhắc -------------
-- Trả về MỖI subscription kèm trạng thái hành trình (day/phase/last_play/last_completed).
-- Logic "tới giờ nào" do edge function quyết (giữ cùng bảng lịch với frontend reminders.ts).
-- Tái hiện _campaign_day() nhưng theo p_uid (không dùng auth.uid() vì service role không có).
create or replace function public.reminder_targets()
returns table (
  user_id uuid, endpoint text, p256dh text, auth text,
  campaign_day int, phase text, last_play_date date, last_completed_date date
)
language sql stable security definer set search_path = public, pg_temp as $$
  select
    ps.user_id, ps.endpoint, ps.p256dh, ps.auth,
    dc.cday as campaign_day,
    case when dc.cday > 21 then 'ended' else 'running' end as phase,
    p.last_play_date,
    lc.last_completed as last_completed_date
  from public.push_subscriptions ps
  join public.profiles p on p.id = ps.user_id
  cross join lateral (
    select
      (select count(*) from public.day_progress dp
         where dp.user_id = ps.user_id and dp.status in ('checked','passed'))::int as done_count,
      exists (select 1 from public.day_progress dp
         where dp.user_id = ps.user_id and dp.status in ('checked','passed')
           and (dp.created_at at time zone 'Asia/Ho_Chi_Minh')::date = public._today_vn()) as done_today
  ) base
  cross join lateral (
    select case
      when base.done_count >= 21 then 22
      when base.done_today      then greatest(base.done_count, 1)
      else base.done_count + 1
    end as cday
  ) dc
  left join lateral (
    select max((dp.created_at at time zone 'Asia/Ho_Chi_Minh')::date) as last_completed
    from public.day_progress dp
    where dp.user_id = ps.user_id and dp.status = 'checked'
  ) lc on true;
$$;
revoke all on function public.reminder_targets() from public, anon, authenticated;
grant execute on function public.reminder_targets() to service_role;

-- Giành "suất" gửi cho (user, ngày, mốc): trả true nếu VỪA chèn (được phép gửi), false nếu đã gửi.
create or replace function public.claim_push_slot(p_user uuid, p_date date, p_minute int)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.push_log(user_id, vn_date, minute) values (p_user, p_date, p_minute)
  on conflict do nothing;
  return found;
end; $$;
revoke all on function public.claim_push_slot(uuid, date, int) from public, anon, authenticated;
grant execute on function public.claim_push_slot(uuid, date, int) to service_role;
