-- =====================================================================
-- TRUNG TÂM THÔNG BÁO (chuông) — nguồn sự thật cho "hệ thống đã bắn noti".
-- Mỗi lần gửi nhắc (scripts/send-reminders.mjs) ghi 1 dòng vào đây; client đọc để
-- hiện danh sách + badge chưa đọc, song song với push ra khay máy. Nhờ vậy dù noti
-- OS không hiện (quyền/thiết bị), người dùng vẫn thấy được trong app.
-- =====================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text not null,
  url        text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Người dùng chỉ đọc/sửa (đánh dấu đã đọc) thông báo của CHÍNH MÌNH.
drop policy if exists notif_select on public.notifications;
drop policy if exists notif_update on public.notifications;
create policy notif_select on public.notifications for select using (user_id = auth.uid());
create policy notif_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Chèn do service_role (sender) làm — bỏ qua RLS; KHÔNG mở insert cho client.

-- Danh sách noti mới nhất của tôi (tối đa 100).
create or replace function public.list_notifications(p_limit int default 30)
returns setof public.notifications language sql security definer set search_path = public, pg_temp as $$
  select * from public.notifications
  where user_id = auth.uid()
  order by created_at desc
  limit least(coalesce(p_limit, 30), 100);
$$;

-- Đánh dấu tất cả đã đọc.
create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.notifications set read = true where user_id = auth.uid() and read = false;
$$;

grant execute on function public.list_notifications(int) to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
