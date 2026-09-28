-- =====================================================================
-- 0006 — Cập nhật NỘI DUNG: quiz Ngày 2 chấm theo KHOẢNG đúng + đồng bộ nhiệm vụ Ngày 3.
-- Idempotent: chạy lại nhiều lần vẫn an toàn.
-- =====================================================================

-- ---- Quiz Ngày 2: 1 câu "trà sữa có bao nhiêu thìa đường?" ----------
-- Đáp án ĐÚNG nằm trong khoảng 12–15 thìa (~50g–60g). Đoán trúng khoảng = full điểm.
alter table public.quiz_questions add column if not exists answer_min numeric;
alter table public.quiz_questions add column if not exists answer_max numeric;

delete from public.quiz_questions where id <> 0;
insert into public.quiz_questions (id, drink, answer, min, max, answer_min, answer_max) values
  (0, 'Một ly trà sữa trân châu size M', 13, 0, 20, 12, 15)
on conflict (id) do update
  set drink = excluded.drink, answer = excluded.answer, min = excluded.min, max = excluded.max,
      answer_min = excluded.answer_min, answer_max = excluded.answer_max;

-- ---- Nhiệm vụ Ngày 3: Đuổi Hình Bắt Chữ (ghép hình đoán tên đồ uống) ----
update public.missions
  set kind = 'GAME', title = 'Đuổi Hình Bắt Chữ',
      description = 'Ghép 2 hình đoán tên đồ uống (Trà Thái · Cam vắt · Sữa gạo), đúng thì mở khoá sự thật về đường & calo.'
  where day = 3;

-- ---- submit_quiz: chấm theo khoảng nếu có answer_min/answer_max -----
-- Trúng khoảng [answer_min, answer_max] = 2 điểm; lệch thì trừ dần theo khoảng cách tới mép gần nhất.
-- Không có khoảng (câu cũ) → giữ công thức khoảng-cách-tới-đáp-án như trước.
create or replace function public.submit_quiz(p_guesses jsonb) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); q record; g numeric; pt numeric; total numeric := 0; items jsonb := '[]'::jsonb; mx numeric;
begin
  if uid is null then raise exception 'forbidden'; end if;
  for q in select id, drink, answer, answer_min, answer_max from public.quiz_questions order by id loop
    g := coalesce((p_guesses ->> q.id::text)::numeric, 0);
    if q.answer_min is not null and q.answer_max is not null then
      if g >= q.answer_min and g <= q.answer_max then
        pt := 2;
      else
        pt := round(greatest(0, 2 - least(abs(g - q.answer_min), abs(g - q.answer_max)) * 0.4) * 10) / 10;
      end if;
    else
      pt := round(greatest(0, 2 - abs(g - q.answer) * 0.4) * 10) / 10;
    end if;
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
