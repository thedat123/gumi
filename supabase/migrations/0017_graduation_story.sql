-- Final game stays in the UI; the graduation note awards the day 21 points.
alter table public.wall_posts add column if not exists story_path text;
update public.missions set title = 'Giải Cứu Gumi & Lời Nhắn Tốt Nghiệp',
  description = 'Giải màn Neko Slide, viết lời cảm nhận gửi lên Bức tường Gumi (+15). Có ảnh chia sẻ Story được cộng thêm 10 điểm.',
  points = 15 where day = 21;

create or replace function public.submit_graduation(p_text text, p_story_path text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); nm text;
        unlocked boolean := public._is_tester() or public._is_admin();
        earned int := case when p_story_path is null then 15 else 25 end;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and op <> 21 then raise exception 'not_today'; end if;
  if length(trim(coalesce(p_text, ''))) < 10 or length(trim(p_text)) > 200 then raise exception 'server'; end if;
  if p_story_path is not null and left(p_story_path, length(uid::text) + 1) <> (uid::text || '/') then
    raise exception 'forbidden';
  end if;
  select name into nm from public.profiles where id = uid;
  insert into public.wall_posts (user_id, name, text, story_path)
    values (uid, coalesce(nm, 'Bạn'), trim(p_text), p_story_path);
  insert into public.day_progress (user_id, day, status, points)
    values (uid, 21, 'checked', earned)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();
end; $$;

grant execute on function public.submit_graduation(text, text) to authenticated;
