-- =====================================================================
-- 0013 — Streak "BẮT ĐẦU CHƠI": số ngày LIÊN TIẾP người dùng mở màn nhiệm vụ.
-- Thay hẳn streak cũ (chuỗi hoàn thành) → cả hiển thị lẫn thưởng điểm đều theo streak này.
-- Idempotent (add column if not exists + create or replace).
-- =====================================================================

alter table public.profiles add column if not exists last_play_date date;
alter table public.profiles add column if not exists play_streak    int not null default 0;

-- Điểm danh khi bắt đầu chơi hôm nay → cập nhật & trả về streak mới.
-- Mở chơi hôm qua → +1; nghỉ >1 ngày → về 1; bấm lại trong ngày → giữ nguyên.
create or replace function public.mark_played() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); today date := public._today_vn(); last_d date; s int;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select last_play_date, play_streak into last_d, s from public.profiles where id = uid;
  if last_d = today then
    return coalesce(s, 0);
  elsif last_d = today - 1 then
    s := coalesce(s, 0) + 1;
  else
    s := 1;
  end if;
  update public.profiles set last_play_date = today, play_streak = s where id = uid;
  return s;
end; $$;

-- Streak dùng chung (hiển thị + thưởng điểm) = streak "bắt đầu chơi" CÒN SỐNG.
-- Còn sống nếu mở chơi hôm nay hoặc hôm qua; nghỉ >1 ngày → 0 (đã đứt).
create or replace function public._streak(p_uid uuid) returns int
language sql stable set search_path = public, pg_temp as $$
  select case
    when last_play_date is null then 0
    when last_play_date >= public._today_vn() - 1 then coalesce(play_streak, 0)
    else 0
  end
  from public.profiles where id = p_uid;
$$;

grant execute on function public.mark_played() to authenticated;
