-- =====================================================================
-- PIVOT 21 → 14 NGÀY (theo brief mới "Level Down — 14 ngày bớt ngọt").
-- Reseed bảng missions còn 14 ngày + cập nhật mọi hàm còn hardcode 21:
--   • độ dài chiến dịch 21 → 14 (_playable_day / _campaign_day / get_campaign_state / journey)
--   • thưởng chuỗi 5/10/15/21 → 5/10/14 (+10/+20/+30)
--   • tốt nghiệp & tiến hoá ở NGÀY 14 (get_my_summary / get_my_journey / submit_graduation)
--   • ngày DRINK có gán mức: chỉ ngày 1 (<baseline) và ngày 10 (DIY 0%); ngày 6 không gate
--   • ngày SHARE vẫn LUÔN vào duyệt tay (giữ từ 0026); admin từ chối → trừ điểm + báo user (0026)
-- Chạy sau 0026. Idempotent: create or replace + upsert.
-- =====================================================================

-- 1) RESEED MISSIONS (14 ngày) ---------------------------------------
delete from public.missions where day > 14;

insert into public.missions (day, kind, title, description, points, needs_level) values
  (1,  'DRINK', 'Bước Nhỏ Đầu Tiên',        'Hạ 1 nấc đường so với thói quen. Chụp tem ly, hoá đơn hoặc ly nước giảm đường.', 15, true),
  (2,  'KNOW',  'Đoán Thìa Đoán Muỗng',     'Mini-quiz: đoán số thìa đường trong đồ uống quen thuộc.', 10, false),
  (3,  'GAME',  'Đuổi Hình Bắt Chữ',        'Ghép 2 hình đoán tên đồ uống, mở khoá sự thật về đường & calo.', 15, false),
  (4,  'SHARE', 'Khoe Ly Cùng Gumi',        'Chụp ly giảm đường, đăng Story kèm hashtag và tag fanpage. Tải ảnh chụp Story lên.', 20, false),
  (5,  'GAME',  'Đấu Trường Calo',          'Sắp xếp 5 đồ uống từ ít đường nhất → nhiều đường nhất (2 lượt).', 20, false),
  (6,  'DRINK', 'Chạm Mốc Giảm Đường',      'Duy trì thói quen giảm đường: uống ly ít đường. Check-in ảnh.', 20, false),
  (7,  'GAME',  'Bay Qua Cơn Thèm',         'Flappy Gumi: lách qua mỗi cột đường +1 điểm (3 vòng 20/50/100).', 20, false),
  (8,  'KNOW',  'Trắc Nghiệm Chớp Nhoáng',  '3 câu trắc nghiệm nhanh về đường, 10 giây mỗi câu.', 30, false),
  (9,  'GAME',  'Truy Tìm Mật Khẩu',        'Wordsearch: tìm 5 tên đường ẩn trong ô chữ.', 50, false),
  (10, 'DRINK', 'DIY Drink',                'Tự chuẩn bị bình nước không thêm đường mang theo. Tải ảnh bình nước lên.', 20, true),
  (11, 'GAME',  'Gumi Bắt Chữ',             'Crossword: đoán từ khoá mỗi dòng (tên đường ẩn) trong 3 phút.', 40, false),
  (12, 'GAME',  'Lật Thẻ Trí Nhớ',          'Lật 10 thẻ, ghép 5 cặp đường ↔ tên gọi trong 30 giây.', 50, false),
  (13, 'SHARE', 'Mẹo Nhỏ Cắt Đường',        'Chia sẻ một mẹo vượt cơn thèm ngọt lên Story, rồi tải ảnh chụp Story lên.', 20, false),
  (14, 'FINAL', 'Hứng Nước & Lời Nhắn Tốt Nghiệp', 'Hứng nước lành hạ Boss Đường, rồi viết lời cảm nhận lên Bức tường Gumi (+15). Có ảnh Story +10.', 25, false)
on conflict (day) do update set
  kind = excluded.kind, title = excluded.title, description = excluded.description,
  points = excluded.points, needs_level = excluded.needs_level;

-- 2) ĐỘ DÀI CHIẾN DỊCH 21 → 14 --------------------------------------
create or replace function public._playable_day() returns int
language sql stable set search_path = public, pg_temp as $$
  select case
    when public._done_count(auth.uid()) >= 14 then 0
    when public._done_today(auth.uid())      then 0
    else public._done_count(auth.uid()) + 1
  end;
$$;

create or replace function public._campaign_day() returns int
language sql stable set search_path = public, pg_temp as $$
  select case
    when public._done_count(auth.uid()) >= 14 then 15
    when public._done_today(auth.uid())      then greatest(public._done_count(auth.uid()), 1)
    else public._done_count(auth.uid()) + 1
  end;
$$;

create or replace function public.get_campaign_state() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare has_profile boolean; sd date; d int;
begin
  select exists (select 1 from public.profiles where id = auth.uid()) into has_profile;
  if not has_profile then
    return json_build_object('phase', 'running', 'day', 0,
                             'startDate', to_char(public._today_vn(), 'YYYY-MM-DD'));
  end if;
  select (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date into sd
  from public.profiles p where p.id = auth.uid();
  d := public._campaign_day();
  return json_build_object(
    'phase', case when d > 14 then 'ended' else 'running' end,
    'day', least(greatest(d, 1), 14),
    'startDate', to_char(coalesce(sd, public._today_vn()), 'YYYY-MM-DD')
  );
end; $$;

-- 3) THƯỞNG CHUỖI 5/10/14 → +10/+20/+30 -----------------------------
create or replace function public._total_points(p_uid uuid) returns numeric
language plpgsql stable set search_path = public, pg_temp as $$
declare mp numeric; s int; bonus numeric;
begin
  select coalesce(sum(points),0) into mp from public.day_progress where user_id = p_uid and status = 'checked';
  s := public._streak(p_uid);
  bonus := (case when s>=5 then 10 else 0 end) + (case when s>=10 then 20 else 0 end)
         + (case when s>=14 then 30 else 0 end);
  return mp + bonus;
end; $$;

-- 4) HÀNH TRÌNH 14 NGÀY (giữ cờ cứu chuỗi/hấp hối của 0020) ----------
create or replace function public.get_my_journey() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  op  int  := public._playable_day();
  cday int := public._campaign_day();
  unlocked boolean := public._is_tester() or public._is_admin();
  days text[] := array[]::text[];
  d int; ast text; st text;
  points numeric; streak int; passes int; rej text;
  pstreak int; lpd date; is_dying boolean; can_freeze boolean;
begin
  if uid is null then raise exception 'forbidden'; end if;

  for d in 1..14 loop
    select status into ast from public.day_progress where user_id = uid and day = d;
    if ast in ('checked', 'passed', 'rejected') then st := ast;
    elsif unlocked then st := 'open';
    elsif op > 0 and d = op then st := 'open';
    else st := 'future';
    end if;
    days := array_append(days, st);
  end loop;

  points := public._total_points(uid);
  streak := public._streak(uid);
  select passes_left, play_streak, last_play_date into passes, pstreak, lpd from public.profiles where id = uid;
  is_dying   := coalesce(pstreak, 0) > 0 and lpd = public._today_vn() - 2;
  can_freeze := is_dying and coalesce(passes, 0) > 0;

  select coalesce(nullif(trim(c.reason), ''), 'ảnh không hợp lệ') into rej
  from public.day_progress dp
  left join public.checkins c
    on c.user_id = dp.user_id and c.day = dp.day and c.status = 'rejected'
  where dp.user_id = uid and dp.status = 'rejected'
  order by dp.day desc limit 1;

  return json_build_object(
    'phase', case when unlocked then 'running' when cday > 14 then 'ended' else 'running' end,
    'day', least(greatest(cday, 1), 14),
    'days', to_json(days),
    'totalPoints', points,
    'streak', streak,
    'rank', public._rank_for(points),
    'passAvailable', coalesce(passes, 0) > 0,
    'passesLeft', coalesce(passes, 0),
    'passHoursLeft', case when is_dying then 24 - extract(hour from (now() at time zone 'Asia/Ho_Chi_Minh'))::int else null end,
    'gumi', case when is_dying then 'hap_hoi'
                 when days[14] = 'checked' then 'tien_hoa' else 'bo_pho' end,
    'rejectedReason', rej,
    'streakFreezeAvailable', can_freeze,
    'streakAtRisk', case when can_freeze then pstreak else 0 end,
    'replayAll', unlocked
  );
end; $$;

-- 5) CHECK-IN: ngày SHARE pending; DRINK gán mức chỉ ngày 1 & 10 -----
create or replace function public.submit_checkin(
  p_day int, p_level int, p_path text,
  p_needs_review boolean default false,
  p_sugar_percent int default null
)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); mk text; pts numeric; needs boolean;
        baseline int; max_level int; pct int := p_sugar_percent;
        unlocked boolean := public._is_tester() or public._is_admin();
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and (op = 0 or p_day <> op) then raise exception 'not_today'; end if;
  select kind, points, needs_level into mk, pts, needs from public.missions where day = p_day;
  if mk is null or mk not in ('DRINK', 'SHARE') then raise exception 'not_today'; end if;

  -- Ngày SHARE (đăng ảnh MXH): LUÔN gửi admin duyệt tay, ghi điểm tạm, chờ duyệt.
  if mk = 'SHARE' then
    delete from public.checkins where user_id = uid and day = p_day;
    insert into public.checkins (user_id, day, path, status, flag)
      values (uid, p_day, p_path, 'pending', 'Đăng MXH — chờ duyệt');
    insert into public.day_progress (user_id, day, status, points, level)
      values (uid, p_day, 'checked', pts, null)
      on conflict (user_id, day) do update
        set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
    return json_build_object('ok', true, 'points', pts, 'pending', true);
  end if;

  if p_needs_review then
    delete from public.checkins where user_id = uid and day = p_day;
    insert into public.checkins (user_id, day, path, status, flag)
      values (uid, p_day, p_path, 'pending', 'AI chưa nhận diện — chờ duyệt tay');
    insert into public.day_progress (user_id, day, status, points, level)
      values (uid, p_day, 'checked', pts, case when needs and p_level in (70,50,30,0) then p_level else null end)
      on conflict (user_id, day) do update
        set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
    return json_build_object('ok', true, 'points', pts, 'pending', true);
  end if;

  -- Đường thường (AI đã pass) — validate mức đường chỉ cho ngày 1 & 10, rồi auto-approve.
  if needs and p_level not in (70, 50, 30, 0) then raise exception 'level_not_allowed'; end if;
  if pct is not null and (pct < 0 or pct > 100) then pct := null; end if;

  if p_day = 1 then
    select level into baseline from public.profiles where id = uid;
    if pct is not null then
      if pct >= baseline then raise exception 'level_not_allowed'; end if;     -- phải thấp hơn thói quen
    else
      max_level := case baseline when 100 then 70 when 70 then 50 when 50 then 30 else 0 end;
      if p_level > max_level then raise exception 'level_not_allowed'; end if;
    end if;
  elsif p_day = 10 then
    if pct is not null then
      if pct > 0 then raise exception 'level_not_allowed'; end if;             -- DIY: 0% đường
    elsif p_level > 0 then raise exception 'level_not_allowed';
    end if;
  end if;
  -- ngày 6 và các DRINK khác: không gán mức, chỉ cần ảnh hợp lệ.

  insert into public.checkins (user_id, day, path, status) values (uid, p_day, p_path, 'approved');
  insert into public.day_progress (user_id, day, status, points, level)
    values (uid, p_day, 'checked', pts, case when needs then p_level else null end)
    on conflict (user_id, day) do update
      set status = 'checked', points = excluded.points, level = excluded.level, created_at = now();
  return json_build_object('ok', true, 'points', pts);
end; $$;

grant execute on function public.submit_checkin(int, int, text, boolean, int) to authenticated;

-- 6) TỐT NGHIỆP Ở NGÀY 14 (giữ nhánh duyệt tay ảnh Story của 0026) ---
create or replace function public.submit_graduation(p_text text, p_story_path text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); op int := public._playable_day(); nm text;
        unlocked boolean := public._is_tester() or public._is_admin();
        earned int := case when p_story_path is null then 25 else 35 end;  -- note 15 + game 10 (+ story 10)
begin
  if uid is null then raise exception 'forbidden'; end if;
  if not unlocked and op <> 14 then raise exception 'not_today'; end if;
  if length(trim(coalesce(p_text, ''))) < 10 or length(trim(p_text)) > 200 then raise exception 'server'; end if;
  if p_story_path is not null and left(p_story_path, length(uid::text) + 1) <> (uid::text || '/') then
    raise exception 'forbidden';
  end if;
  select name into nm from public.profiles where id = uid;
  insert into public.wall_posts (user_id, name, text, story_path)
    values (uid, coalesce(nm, 'Bạn'), trim(p_text), p_story_path);
  insert into public.day_progress (user_id, day, status, points)
    values (uid, 14, 'checked', earned)
    on conflict (user_id, day) do update set status = 'checked', points = excluded.points, created_at = now();

  if p_story_path is not null then
    delete from public.checkins where user_id = uid and day = 14;
    insert into public.checkins (user_id, day, path, status, flag)
      values (uid, 14, p_story_path, 'pending', 'Tốt nghiệp — chờ duyệt');
  end if;
end; $$;

grant execute on function public.submit_graduation(text, text) to authenticated;

-- 7) SUMMARY: đủ điều kiện & chốt hạng theo NGÀY 14 ------------------
create or replace function public.get_my_summary() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid(); cday int := public._campaign_day();
  eligible boolean; grams numeric; lowest int; healthy int; qscore numeric; qmax numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  select exists (select 1 from public.day_progress where user_id = uid and day = 14 and status = 'checked') into eligible;
  select coalesce(sum(40 - public._grams(level)), 0) into grams
    from public.day_progress
    where user_id = uid and level is not null
      and day in (select day from public.missions where needs_level);
  select coalesce(min(level), 100) into lowest
    from public.day_progress where user_id = uid and level is not null;
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
    'rankFinal', cday > 14
  );
end; $$;

-- 8) ADMIN STATS: đạt chỉ tiêu ≥10/14, về đích = ngày 14 -------------
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
        'usedPass', passes_left < 3
      ) order by points desc), '[]'::json)
      from pl
    )
  ) into res;
  return res;
end; $$;

grant execute on function public.admin_stats() to authenticated;
