-- Day 2: đoán đúng khoảng (12–15 thìa) được +10; đoán sai được +2 điểm an ủi.
create or replace function public.submit_quiz(p_guesses jsonb) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day();
        unlocked boolean := public._is_tester() or public._is_admin();
        q record; g numeric; pt numeric; total numeric := 0; items jsonb := '[]'::jsonb; mx numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and op <> 2 then raise exception 'not_today'; end if;
  for q in select id, drink, answer from public.quiz_questions order by id loop
    g := coalesce((p_guesses ->> q.id::text)::numeric, 0);
    pt := case when g >= 12 and g <= 15 then 10 else 2 end;
    total := total + pt;
    items := items || jsonb_build_object('id', q.id, 'guess', g, 'answer', q.answer, 'points', pt);
  end loop;
  select count(*) * 10 into mx from public.quiz_questions;
  insert into public.quiz_results (user_id, score, max, items) values (uid, total, mx, items)
    on conflict (user_id) do update set score = excluded.score, max = excluded.max, items = excluded.items, created_at = now();
  insert into public.day_progress (user_id, day, status, points) values (uid, 2, 'checked', total)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();
  return json_build_object('score', total, 'max', mx, 'items', items);
end; $$;
