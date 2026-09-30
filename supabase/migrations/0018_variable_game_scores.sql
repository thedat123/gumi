-- Store the actual award for games with per-question, per-pair, or random points.
update public.missions set description = 'Lật 10 thẻ, ghép 5 cặp đồ uống ít đường trong 30 giây (+10/cặp).' where day = 18;
create or replace function public.submit_minigame_score(p_day int, p_points int)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); mk text;
        unlocked boolean := public._is_tester() or public._is_admin();
        valid boolean := false;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and (op = 0 or p_day <> op) then raise exception 'not_today'; end if;
  select kind into mk from public.missions where day = p_day;
  if mk not in ('GAME', 'KNOW') then raise exception 'server'; end if;
  valid := case
    when p_day = 6 then p_points in (0, 10, 20)
    when p_day in (12, 18) then p_points between 0 and 50 and p_points % 10 = 0
    when p_day = 16 then p_points between 0 and 40 and p_points % 5 = 0
    when p_day = 17 then p_points between 0 and 25 and p_points % 5 = 0
    when p_day = 19 then p_points in (10, 15, 20, 25, 30)
    else false end;
  if not valid then raise exception 'server'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, p_day, 'checked', p_points)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();
  return json_build_object('ok', true, 'points', p_points);
end; $$;

grant execute on function public.submit_minigame_score(int, int) to authenticated;
