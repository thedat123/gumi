-- A new round invalidates every device's previous play and unsent results.
-- Only database maintenance can rotate this token; clients may only read it.
create table if not exists public.event_state (
  singleton boolean primary key default true check (singleton),
  round_id uuid not null default gen_random_uuid()
);
insert into public.event_state(singleton) values (true) on conflict do nothing;
alter table public.event_state enable row level security;
revoke all on public.event_state from public, anon, authenticated;

create or replace function public.event_round()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select round_id from public.event_state where singleton;
$$;
revoke all on function public.event_round() from public;
grant execute on function public.event_round() to anon, authenticated;

-- Old clients cannot reinsert old scores after a reset. Updated clients must
-- supply the round they started in. The shared lock serializes with clear's
-- update lock: an old submission either commits before the delete or rejects.
drop function if exists public.event_submit(uuid, uuid, text, int, int);
create or replace function public.event_submit(
  p_id uuid, p_key uuid, p_player text, p_game int, p_score int, p_round uuid default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare current_round uuid;
begin
  select round_id into current_round from public.event_state where singleton for share;
  if p_round is null or p_round is distinct from current_round then
    raise exception 'EVENT_ROUND_EXPIRED' using errcode = 'P0001';
  end if;
  insert into public.event_plays(id, player_key, player, game, score)
  values (p_id, p_key, btrim(p_player), p_game, p_score)
  on conflict do nothing;
end $$;
revoke all on function public.event_submit(uuid, uuid, text, int, int, uuid) from public;
grant execute on function public.event_submit(uuid, uuid, text, int, int, uuid) to anon, authenticated;

-- Public change signal only: no player IDs, names, scores or device keys.
-- Realtime clients subscribe here, never to the private event_plays table.
create table if not exists public.event_board_updates (
  singleton boolean primary key default true check(singleton),
  revision bigint not null default 0,
  changed_at timestamptz not null default '-infinity'
);
insert into public.event_board_updates(singleton) values(true) on conflict do nothing;
alter table public.event_board_updates enable row level security;
revoke all on public.event_board_updates from public, anon, authenticated;
grant select on public.event_board_updates to anon, authenticated;
drop policy if exists event_board_updates_read on public.event_board_updates;
create policy event_board_updates_read on public.event_board_updates
  for select to anon, authenticated using(true);
create or replace function public._event_board_changed()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- At most one score-change signal per second, even during a submission spike.
  -- Deletes (including clear of an empty event) always signal a reset.
  update public.event_board_updates
  set revision = revision + 1, changed_at = clock_timestamp()
  where singleton and (TG_OP = 'DELETE' or changed_at < clock_timestamp() - interval '1 second');
  return null;
end $$;
revoke all on function public._event_board_changed() from public;
drop trigger if exists event_board_changed on public.event_plays;
create trigger event_board_changed after insert or delete on public.event_plays
  for each statement execute function public._event_board_changed();
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='event_board_updates') then
    alter publication supabase_realtime add table public.event_board_updates;
  end if;
end $$;
