-- Sự kiện bản QR: ai quét mã cũng chơi được trên điện thoại, KHÔNG cần đăng nhập.
-- Mỗi người nhập tên cá nhân rồi chơi tối đa 3 game (mỗi game 1 lần / điện thoại). Mỗi lượt = 1 dòng.
-- Xếp hạng: riêng từng game + bảng TỔNG HỢP (chơi nhiều game xếp trên, rồi tới tổng điểm).
-- Bảng cũ event_results (bản đội chơi 4 game) giữ nguyên làm lịch sử, không dùng nữa.

create table if not exists public.event_plays (
  id         uuid primary key,
  player_key uuid not null,  -- mã ngẫu nhiên của điện thoại → gom các game của cùng 1 người
  player     text not null check (length(btrim(player)) between 1 and 40),
  game       smallint not null check (game between 1 and 3),
  score      integer not null check (
               score >= 0 and score % 5 = 0 and
               case game when 1 then score <= 600 else score <= 25 end),
  created_at timestamptz not null default now(),
  unique (player_key, game)   -- mỗi điện thoại chơi mỗi game 1 lần
);
create index if not exists event_plays_rank on public.event_plays(game, score desc, created_at);
alter table public.event_plays enable row level security;

-- Người chơi ẩn danh không chạm thẳng vào bảng; chỉ đi qua các hàm bên dưới.
revoke all on public.event_plays from anon, authenticated;
grant select, delete on public.event_plays to authenticated;
drop policy if exists event_plays_admin_read on public.event_plays;
create policy event_plays_admin_read on public.event_plays for select to authenticated using (public._is_admin());
drop policy if exists event_plays_admin_delete on public.event_plays;
create policy event_plays_admin_delete on public.event_plays for delete to authenticated using (public._is_admin());

-- Gửi điểm. id do máy tạo → gửi lại nhiều lần (mạng chập chờn) vẫn chỉ ghi 1 dòng;
-- cùng điện thoại chơi lại 1 game thì giữ lượt đầu.
create or replace function public.event_submit(p_id uuid, p_key uuid, p_player text, p_game int, p_score int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.event_plays(id, player_key, player, game, score)
  values (p_id, p_key, btrim(p_player), p_game, p_score)
  on conflict do nothing;
end $$;
revoke all on function public.event_submit(uuid, uuid, text, int, int) from public;
grant execute on function public.event_submit(uuid, uuid, text, int, int) to anon, authenticated;

-- Bảng xếp hạng 1 game (hoà điểm: ai chơi trước xếp trên).
create or replace function public.event_board(p_game int, p_limit int default 100)
returns table(id uuid, player text, score int, rank bigint, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select e.id, e.player, e.score,
         row_number() over (order by e.score desc, e.created_at),
         e.created_at
  from public.event_plays e
  where e.game = p_game
  order by e.score desc, e.created_at
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;
revoke all on function public.event_board(int, int) from public;
grant execute on function public.event_board(int, int) to anon, authenticated;

-- Bảng tổng hợp: ai chơi nhiều game hơn xếp trên, cùng số game thì tổng điểm cao hơn, rồi ai xong trước.
create or replace function public.event_total(p_limit int default 100, p_key uuid default null)
returns table(id text, player text, games int, total int, rank bigint, me boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  with t as (
    select e.player_key,
           (array_agg(e.player order by e.created_at desc))[1] as player,
           count(*)::int as games, sum(e.score)::int as total, max(e.created_at) as last_at
    from public.event_plays e group by e.player_key
  ), r as (
    select t.*, row_number() over (order by t.games desc, t.total desc, t.last_at) as rank from t
  )
  -- Không trả mã điện thoại ra ngoài (tránh người khác gửi điểm thay); chỉ báo dòng nào là "bạn".
  select md5(r.player_key::text), r.player, r.games, r.total, r.rank, r.player_key = p_key
  from r
  where r.rank <= least(greatest(coalesce(p_limit, 100), 1), 1000) or r.player_key = p_key
  order by r.rank;
$$;
revoke all on function public.event_total(int, uuid) from public;
grant execute on function public.event_total(int, uuid) to anon, authenticated;

-- Admin xem trực tiếp (realtime).
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='event_plays') then
    alter publication supabase_realtime add table public.event_plays;
  end if;
end $$;
