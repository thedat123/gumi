-- Sự kiện QR — đổi luật: mỗi điện thoại chơi 1 game (1 lượt) → 1 bảng xếp hạng CHUNG.
-- Bỏ bảng theo từng game + bảng Tổng hợp của 0063.

-- 1 lượt / điện thoại. Lượt thứ 2 (nếu lỡ có từ luật cũ) giữ lượt đầu tiên.
delete from public.event_plays e
using public.event_plays older
where e.player_key = older.player_key and (older.created_at, older.id) < (e.created_at, e.id);
alter table public.event_plays drop constraint if exists event_plays_player_key_game_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'event_plays_player_key_key' and conrelid = 'public.event_plays'::regclass) then
    alter table public.event_plays add constraint event_plays_player_key_key unique (player_key);
  end if;
end $$;
drop index if exists public.event_plays_rank;
create index if not exists event_plays_board on public.event_plays(score desc, created_at);

drop function if exists public.event_board(int, int);
drop function if exists public.event_total(int, uuid);

-- Bảng xếp hạng chung, PHÂN TRANG phía máy chủ (hàng trăm điện thoại cùng mở → mỗi lần chỉ trả 1 trang).
-- Điểm cao xếp trên, bằng điểm thì ai chơi trước xếp trên. `total` = tổng số người để tính số trang.
-- Không trả mã điện thoại ra ngoài; dòng của chính người hỏi (p_key) luôn được trả kèm, cờ me = true.
create or replace function public.event_board(p_offset int default 0, p_limit int default 20, p_key uuid default null)
returns table(id uuid, player text, game int, score int, rank bigint, me boolean, total bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  with r as (
    select e.*, row_number() over (order by e.score desc, e.created_at) as rank, count(*) over () as total
    from public.event_plays e
  )
  select r.id, r.player, r.game::int, r.score, r.rank, r.player_key = p_key, r.total
  from r
  where (r.rank > greatest(coalesce(p_offset, 0), 0)
         and r.rank <= greatest(coalesce(p_offset, 0), 0) + least(greatest(coalesce(p_limit, 20), 1), 100))
     or r.player_key = p_key
  order by r.rank;
$$;
revoke all on function public.event_board(int, int, uuid) from public;
grant execute on function public.event_board(int, int, uuid) to anon, authenticated;
