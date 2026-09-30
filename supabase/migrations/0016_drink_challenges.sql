-- Keep drink missions and sugar limits in sync with the app.
drop policy if exists checkin_replace on storage.objects;
create policy checkin_replace on storage.objects for update to authenticated
  using (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);

update public.missions set title = 'DIY Drink',
  description = 'Tự chuẩn bị bình nước mang đi học hoặc đi làm: nước lọc thả lát trái cây, bạc hà hoặc trà túi lọc không đường. Tải ảnh bình nước lên.',
  points = 20 where day = 10;
update public.missions set title = 'Mẹo Nhỏ Cắt Đường',
  description = 'Chia sẻ một mẹo giúp bạn vượt qua cơn thèm ngọt lên Story, rồi tải ảnh chụp Story lên.'
  where day = 13;

create or replace function public.submit_checkin(p_day int, p_level int, p_path text)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); mk text; pts numeric; needs boolean;
        baseline int; max_level int;
        unlocked boolean := public._is_tester() or public._is_admin();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and (op = 0 or p_day <> op) then raise exception 'not_today'; end if;
  select kind, points, needs_level into mk, pts, needs from public.missions where day = p_day;
  if mk is null or mk not in ('DRINK', 'SHARE') then raise exception 'not_today'; end if;
  if needs and p_level not in (70, 50, 30, 0) then raise exception 'level_not_allowed'; end if;
  if p_day = 1 then
    select level into baseline from public.profiles where id = uid;
    max_level := case baseline when 100 then 70 when 70 then 50 when 50 then 30 else 0 end;
  elsif p_day = 5 then max_level := 50;
  elsif p_day = 15 then max_level := 30;
  elsif p_day = 20 then max_level := 0;
  end if;
  if max_level is not null and p_level > max_level then raise exception 'level_not_allowed'; end if;

  insert into public.checkins (user_id, day, path, status) values (uid, p_day, p_path, 'approved');
  insert into public.day_progress (user_id, day, status, points, level)
    values (uid, p_day, 'checked', pts, case when needs then p_level else null end)
    on conflict (user_id, day) do update
      set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
  return json_build_object('ok', true, 'points', pts);
end; $$;
