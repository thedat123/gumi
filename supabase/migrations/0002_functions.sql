-- =====================================================================
-- Level Down Challenge — RPC + STORAGE
-- Top-level RPC = SECURITY DEFINER (bỏ qua RLS, tự kiểm auth.uid()).
-- Helper _xxx = SECURITY INVOKER: gọi trực tiếp thì RLS chỉ cho thấy dữ liệu
-- của chính mình; gọi lồng trong RPC definer thì chạy quyền owner (bỏ RLS).
-- Mọi hàm set search_path để tránh chiếm dụng schema.
-- =====================================================================

-- ---------- Helpers ---------------------------------------------------
create or replace function public._today_vn() returns date
language sql stable set search_path = public, pg_temp as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date;
$$;

-- Ngày hiện tại của chiến dịch: <1 = chưa mở, 1..21 = đang chạy, >21 = đã kết thúc.
create or replace function public._campaign_day() returns int
language sql stable set search_path = public, pg_temp as $$
  select (public._today_vn() - c.start_date) + 1 from public.app_config c where c.id;
$$;

create or replace function public._is_admin() returns boolean
language sql stable set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Gram đường / ly theo mức (khớp src/lib/sugar.ts).
create or replace function public._grams(p_level int) returns numeric
language sql immutable set search_path = public, pg_temp as $$
  select case p_level when 100 then 40 when 70 then 28 when 50 then 20 when 30 then 12 else 0 end;
$$;

-- Chuỗi dài nhất (checked/passed liên tiếp) trên 21 ngày, theo lịch.
create or replace function public._streak(p_uid uuid) returns int
language plpgsql stable set search_path = public, pg_temp as $$
declare cday int := public._campaign_day(); d int; ast text; run int := 0; best int := 0; kept boolean;
begin
  for d in 1..21 loop
    select status into ast from public.day_progress where user_id = p_uid and day = d;
    kept := ast in ('checked','passed');
    if kept then run := run + 1; best := greatest(best, run); else run := 0; end if;
  end loop;
  return best;
end; $$;

-- Tổng điểm = điểm nhiệm vụ (day_progress checked) + thưởng chuỗi (5/10/15/21 → 10/20/30/50).
create or replace function public._total_points(p_uid uuid) returns numeric
language plpgsql stable set search_path = public, pg_temp as $$
declare mp numeric; s int; bonus numeric;
begin
  select coalesce(sum(points),0) into mp from public.day_progress where user_id = p_uid and status = 'checked';
  s := public._streak(p_uid);
  bonus := (case when s>=5 then 10 else 0 end) + (case when s>=10 then 20 else 0 end)
         + (case when s>=15 then 30 else 0 end) + (case when s>=21 then 50 else 0 end);
  return mp + bonus;
end; $$;

-- Hạng theo bảng seed: hơn điểm → hạng nhỏ; ngoài top 10 thì suy ra gần đúng.
create or replace function public._rank_for(p numeric) returns int
language plpgsql stable set search_path = public, pg_temp as $$
declare better int; last10 numeric;
begin
  select count(*) into better from public.leaderboard_seed where points > p;
  if better < 10 then return better + 1; end if;
  select points into last10 from public.leaderboard_seed where rank = 10;
  return 10 + greatest(1, round((last10 - p) / 3.0))::int;
end; $$;

-- ---------- Hồ sơ -----------------------------------------------------
create or replace function public.get_profile() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'id', p.id, 'name', p.name, 'avatar', p.avatar, 'level', p.level,
    'drinksPerWeek', p.drinks_per_week, 'role', p.role,
    'sugarPassAvailable', p.passes_left > 0
  ) from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.create_profile(p_name text, p_avatar text, p_level int, p_drinks int)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); r text := 'player';
begin
  if uid is null then raise exception 'forbidden'; end if;
  if exists (select 1 from auth.users where id = uid and email ilike 'admin%') then r := 'admin'; end if;
  insert into public.profiles (id, name, avatar, level, drinks_per_week, role)
  values (uid, p_name, p_avatar, p_level, p_drinks, r)
  on conflict (id) do update
    set name = excluded.name, avatar = excluded.avatar, level = excluded.level, drinks_per_week = excluded.drinks_per_week;
  return public.get_profile();
end; $$;

create or replace function public.update_profile(p_patch jsonb)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'forbidden'; end if;
  update public.profiles set
    name            = coalesce(p_patch->>'name', name),
    avatar          = coalesce(p_patch->>'avatar', avatar),
    level           = coalesce((p_patch->>'level')::int, level),
    drinks_per_week = coalesce((p_patch->>'drinksPerWeek')::int, drinks_per_week)
  where id = uid;
  return public.get_profile();
end; $$;

-- ---------- Trạng thái chiến dịch ------------------------------------
create or replace function public.get_campaign_state() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'phase', case when public._campaign_day() < 1 then 'before'
                  when public._campaign_day() > 21 then 'ended' else 'running' end,
    'day', least(greatest(public._campaign_day(), 0), 21),
    'startDate', to_char(c.start_date, 'YYYY-MM-DD')
  ) from public.app_config c where c.id;
$$;

-- ---------- Hành trình (Dashboard) -----------------------------------
create or replace function public.get_my_journey() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  cday int := public._campaign_day();
  days text[] := array[]::text[];
  d int; ast text; st text;
  points numeric; streak int; passes int; rej text;
begin
  if uid is null then raise exception 'forbidden'; end if;
  for d in 1..21 loop
    select status into ast from public.day_progress where user_id = uid and day = d;
    if    ast = 'passed'   then st := 'passed';
    elsif ast = 'rejected' then st := 'rejected';
    elsif ast = 'checked'  then st := 'checked';
    elsif d < cday         then st := 'missed';
    elsif d = cday         then st := 'open';
    else                        st := 'future';
    end if;
    days := array_append(days, st);
  end loop;

  points := public._total_points(uid);
  streak := public._streak(uid);
  select passes_left into passes from public.profiles where id = uid;
  -- Lý do từ chối thật (admin nhập) cho ngày bị gỡ gần nhất; mặc định nếu trống.
  select coalesce(nullif(trim(c.reason), ''), 'ảnh không hợp lệ') into rej
  from public.day_progress dp
  left join public.checkins c
    on c.user_id = dp.user_id and c.day = dp.day and c.status = 'rejected'
  where dp.user_id = uid and dp.status = 'rejected'
  order by dp.day desc limit 1;

  return json_build_object(
    'phase', case when cday < 1 then 'before' when cday > 21 then 'ended' else 'running' end,
    'day', least(greatest(cday, 1), 21),
    'days', to_json(days),
    'totalPoints', points,
    'streak', streak,
    'rank', public._rank_for(points),
    'passAvailable', coalesce(passes, 0) > 0,
    'passesLeft', coalesce(passes, 0),
    'passHoursLeft', null,
    'gumi', case when days[21] = 'checked' then 'tien_hoa' else 'bo_pho' end,
    'rejectedReason', rej
  );
end; $$;

-- ---------- Bảng xếp hạng --------------------------------------------
create or replace function public.get_leaderboard() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid(); mp numeric; mr int; myname text;
  last_name text; last_pts numeric; top json;
begin
  if uid is null then raise exception 'forbidden'; end if;
  mp := public._total_points(uid);
  mr := public._rank_for(mp);
  select name into myname from public.profiles where id = uid;
  select name, points into last_name, last_pts from public.leaderboard_seed where rank = 10;

  select json_agg(r) into top from (
    select rank,
           case when rank = mr then coalesce(myname, 'Bạn') else name end as name,
           avatar,
           case when rank = mr then mp else points end as points,
           case when rank = mr then true else null end as "isMe"
    from public.leaderboard_seed
    order by rank
  ) r;

  return json_build_object(
    'top', top,
    'me', json_build_object(
      'rank', mr, 'points', mp,
      'gapToTop10', greatest(0, last_pts - mp + 1),
      'top10LastName', last_name
    )
  );
end; $$;

-- ---------- Check-in ảnh (DRINK/SHARE) -------------------------------
create or replace function public.submit_checkin(p_day int, p_level int, p_path text)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); cday int := public._campaign_day(); mk text; pts numeric; needs boolean;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if p_day <> cday then raise exception 'not_today'; end if;
  select kind, points, needs_level into mk, pts, needs from public.missions where day = p_day;
  if mk is null or mk not in ('DRINK','SHARE') then raise exception 'not_today'; end if;
  if exists (select 1 from public.day_progress where user_id = uid and day = p_day and status in ('checked','passed'))
    then raise exception 'already_done'; end if;
  if needs and p_level not in (70,50,30,0) then raise exception 'level_not_allowed'; end if;

  insert into public.checkins (user_id, day, path, status) values (uid, p_day, p_path, 'approved');
  insert into public.day_progress (user_id, day, status, points, level)
    values (uid, p_day, 'checked', pts, case when needs then p_level else null end)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, level = excluded.level;

  return json_build_object('ok', true, 'points', pts);
end; $$;

-- ---------- Mini-game / KNOW / boss (không dùng quiz Ngày 2) ---------
-- Hợp lệ cho các ngày GAME/KNOW/FINAL trừ Ngày 2 (quiz đi qua submit_quiz).
-- Nguồn sự thật là bảng missions — không hard-code danh sách ngày.
create or replace function public.submit_minigame(p_day int)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); cday int := public._campaign_day(); mk text; pts numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select kind, points into mk, pts from public.missions where day = p_day;
  if mk is null or p_day = 2 or mk not in ('GAME','KNOW','FINAL') then raise exception 'server'; end if;
  if p_day <> cday then raise exception 'not_today'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, p_day, 'checked', coalesce(pts,0))
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points;
  return json_build_object('ok', true, 'points', coalesce(pts,0));
end; $$;

-- ---------- Bùa Hồi Sinh (Sugar Pass) — cứu ngày hôm nay ------------
create or replace function public.use_sugar_pass() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); cday int := public._campaign_day(); left_ int;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if cday < 1 or cday > 21 then raise exception 'not_today'; end if;
  select passes_left into left_ from public.profiles where id = uid;
  if coalesce(left_, 0) <= 0 then raise exception 'no_pass'; end if;
  insert into public.day_progress (user_id, day, status, points)
    values (uid, cday, 'passed', 0)
    on conflict (user_id, day) do update set status = 'passed', points = 0;
  update public.profiles set passes_left = passes_left - 1 where id = uid;
end; $$;

-- ---------- Quiz Ngày 2 ---------------------------------------------
create or replace function public.get_quiz_questions() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(json_agg(json_build_object('id', id, 'drink', drink, 'min', min, 'max', max) order by id), '[]'::json)
  from public.quiz_questions;
$$;

create or replace function public.submit_quiz(p_guesses jsonb) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); q record; g numeric; pt numeric; total numeric := 0; items jsonb := '[]'::jsonb; mx numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  for q in select id, drink, answer from public.quiz_questions order by id loop
    g  := coalesce((p_guesses ->> q.id::text)::numeric, 0);
    pt := round(greatest(0, 2 - abs(g - q.answer) * 0.4) * 10) / 10;
    total := total + pt;
    items := items || jsonb_build_object('id', q.id, 'guess', g, 'answer', q.answer, 'points', pt);
  end loop;
  total := round(total * 10) / 10;
  select count(*) * 2 into mx from public.quiz_questions;

  insert into public.quiz_results (user_id, score, max, items) values (uid, total, mx, items)
    on conflict (user_id) do update set score = excluded.score, max = excluded.max, items = excluded.items, created_at = now();
  insert into public.day_progress (user_id, day, status, points) values (uid, 2, 'checked', total)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points;

  return json_build_object('score', total, 'max', mx, 'items', items);
end; $$;

-- ---------- Tường chia sẻ -------------------------------------------
create or replace function public.submit_wall_post(p_text text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); nm text;
begin
  if uid is null then raise exception 'forbidden'; end if;
  if coalesce(trim(p_text), '') = '' then raise exception 'server'; end if;
  select name into nm from public.profiles where id = uid;
  insert into public.wall_posts (user_id, name, text) values (uid, coalesce(nm, 'Bạn'), p_text);
end; $$;

create or replace function public.get_wall_posts() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(json_agg(json_build_object(
    'id', id, 'name', name, 'text', text, 'createdAt', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  ) order by created_at desc), '[]'::json) from public.wall_posts;
$$;

-- ---------- Tổng kết -------------------------------------------------
create or replace function public.get_my_summary() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid(); cday int := public._campaign_day();
  eligible boolean; grams numeric; lowest int; healthy int; qscore numeric; qmax numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select exists (select 1 from public.day_progress where user_id = uid and day = 21 and status = 'checked') into eligible;
  -- Đường đã cắt: chỉ các ngày DRINK có chọn mức đường (needs_level)
  select coalesce(sum(40 - public._grams(level)), 0) into grams
    from public.day_progress
    where user_id = uid and level is not null
      and day in (select day from public.missions where needs_level);
  select coalesce(min(level), 100) into lowest
    from public.day_progress where user_id = uid and level is not null;
  -- Số ly healthy = số ngày DRINK đã check-in
  select count(*) into healthy
    from public.day_progress
    where user_id = uid and status = 'checked'
      and day in (select day from public.missions where kind = 'DRINK');
  select coalesce(score, 0), coalesce(max, (select count(*)*2 from public.quiz_questions))
    into qscore, qmax from public.quiz_results where user_id = uid;

  return json_build_object(
    'eligible', eligible,
    'sugarCutGrams', grams,
    'sugarCutSpoons', round((grams / 4.0) * 10) / 10,
    'lowestLevel', lowest,
    'healthyCount', healthy,
    'healthyTotal', (select count(*) from public.missions where kind = 'DRINK'),
    'quizScore', coalesce(qscore, 0),
    'quizMax', coalesce(qmax, (select count(*)*2 from public.quiz_questions)),
    'streak', public._streak(uid),
    'totalPoints', public._total_points(uid),
    'rank', public._rank_for(public._total_points(uid)),
    'rankFinal', cday > 21
  );
end; $$;

-- ---------- Admin ----------------------------------------------------
create or replace function public.admin_list_checkins(p_day int) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', c.id, 'user', coalesce(p.name, '—'), 'day', c.day,
      'status', c.status, 'emoji', c.path, 'flag', c.flag
    ) order by c.created_at)
    from public.checkins c left join public.profiles p on p.id = c.user_id
    where c.day = p_day
  ), '[]'::json);
end; $$;

create or replace function public.admin_list_flags() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', c.id, 'user', coalesce(p.name, '—'), 'day', c.day,
      'status', c.status, 'emoji', c.path, 'flag', c.flag
    ) order by c.created_at)
    from public.checkins c left join public.profiles p on p.id = c.user_id
    where c.flag is not null
  ), '[]'::json);
end; $$;

-- Duyệt/gỡ ảnh → phản ánh vào day_progress để cập nhật điểm/hành trình.
create or replace function public.admin_set_checkin_status(p_id uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c record; pts numeric;
begin
  if not public._is_admin() then raise exception 'forbidden'; end if;
  update public.checkins set status = p_status, reason = p_reason where id = p_id returning * into c;
  if not found then raise exception 'server'; end if;

  if p_status = 'approved' then
    select points into pts from public.missions where day = c.day;
    insert into public.day_progress (user_id, day, status, points)
      values (c.user_id, c.day, 'checked', coalesce(pts,0))
      on conflict (user_id, day) do update set status = 'checked', points = excluded.points;
  elsif p_status = 'rejected' then
    insert into public.day_progress (user_id, day, status, points)
      values (c.user_id, c.day, 'rejected', 0)
      on conflict (user_id, day) do update set status = 'rejected', points = 0;
  end if;
end; $$;

-- =====================================================================
-- Quyền chạy RPC
-- =====================================================================
grant execute on all functions in schema public to authenticated;
-- Trang landing gọi trạng thái chiến dịch trước khi đăng nhập
grant execute on function public.get_campaign_state() to anon;

-- =====================================================================
-- STORAGE — bucket ảnh check-in (riêng tư): chủ ảnh & admin được xem
-- =====================================================================
insert into storage.buckets (id, name, public)
  values ('checkins', 'checkins', false)
  on conflict (id) do nothing;

drop policy if exists checkin_upload on storage.objects;
drop policy if exists checkin_read   on storage.objects;
create policy checkin_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);
create policy checkin_read on storage.objects for select to authenticated
  using (bucket_id = 'checkins' and ((storage.foldername(name))[1] = auth.uid()::text or public._is_admin()));
