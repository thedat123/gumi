-- 0028 — Bùa Hồi Sinh: giảm từ 3 → 2 cho cả hành trình.
-- Đổi mặc định + ràng buộc cột, kẹp lại hồ sơ cũ, và sửa cờ usedPass (passes_left < 2).

-- 1) Kẹp hồ sơ cũ về tối đa 2 trước khi siết ràng buộc.
update public.profiles set passes_left = 2 where passes_left > 2;

-- 2) Mặc định mới = 2, ràng buộc 0..2.
alter table public.profiles alter column passes_left set default 2;
alter table public.profiles drop constraint if exists profiles_passes_left_check;
alter table public.profiles add constraint profiles_passes_left_check check (passes_left between 0 and 2);

-- 3) ADMIN STATS: "đã dùng Bùa" = còn ít hơn tối đa (2). Giữ nguyên phần còn lại của 0027.
create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare res json;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  with pl as (
    select p.id, p.name, p.avatar, p.passes_left,
           (select count(*) from public.day_progress d where d.user_id = p.id and d.status = 'checked')::int as days_done,
           public._total_points(p.id) as points,
           public._streak(p.id)       as streak
    from public.profiles p
    where p.role <> 'admin'
  )
  select json_build_object(
    'totalPlayers',    (select count(*) from pl),
    'activePlayers',   (select count(*) from pl where days_done > 0 and days_done < 14),
    'eligibleCount',   (select count(*) from pl where days_done >= 10),
    'finishedCount',   (select count(*) from pl where days_done >= 14),
    'avgPoints',       (select coalesce(round(avg(points)), 0) from pl),
    'avgDaysDone',     (select coalesce(round(avg(days_done), 1), 0) from pl),
    'pendingCheckins', (select count(*) from public.checkins where status = 'pending'),
    'players', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'name', name, 'avatar', avatar,
        'daysDone', days_done, 'points', points, 'streak', streak,
        'eligible', days_done >= 10, 'finished', days_done >= 14,
        'usedPass', passes_left < 2
      ) order by points desc), '[]'::json)
      from pl
    )
  ) into res;
  return res;
end; $$;

grant execute on function public.admin_stats() to authenticated;
