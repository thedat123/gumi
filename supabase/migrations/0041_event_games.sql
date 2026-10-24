-- Isolated live-event results. No writes to journey/checkins/normal leaderboard.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('player','admin','gamer'));

-- Three explicitly assigned operator accounts. Assignment is server-only.
create table if not exists public.event_operators (
  slot integer primary key check (slot between 1 and 3),
  user_id uuid not null unique references public.profiles(id) on delete cascade
);
alter table public.event_operators enable row level security;
revoke all on public.event_operators from anon, authenticated;
create or replace function public._is_event_gamer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.event_operators o join public.profiles p on p.id=o.user_id where p.id=auth.uid() and p.role='gamer');
$$;
revoke all on function public._is_event_gamer() from public;
grant execute on function public._is_event_gamer() to authenticated;

create table if not exists public.event_results (
  id uuid primary key,
  operator_id uuid not null default auth.uid() references auth.users(id),
  team text not null check (length(btrim(team)) between 1 and 60),
  scores integer[] not null check (
    array_ndims(scores)=1 and array_lower(scores,1)=1 and cardinality(scores)=4
    and array_position(scores,null) is null
    and scores[1] between 0 and 600 and scores[1]%5=0
    and scores[2] between 0 and 25 and scores[2]%5=0
    and scores[3] between 0 and 25 and scores[3]%5=0
    and scores[4] between 0 and 40),
  total integer not null check (total=scores[1]+scores[2]+scores[3]+scores[4]),
  created_at timestamptz not null default now()
);
create index if not exists event_results_rank on public.event_results(total desc,created_at);
alter table public.event_results enable row level security;
grant select, insert on public.event_results to authenticated;
revoke update,delete on public.event_results from authenticated,anon;
drop policy if exists event_read on public.event_results;
create policy event_read on public.event_results for select to authenticated using (public._is_event_gamer() or public._is_admin());
drop policy if exists event_insert on public.event_results;
create policy event_insert on public.event_results for insert to authenticated with check (public._is_event_gamer() and operator_id=auth.uid());
-- Idempotent client writes use ON CONFLICT DO NOTHING; no score edits.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='event_results') then
    alter publication supabase_realtime add table public.event_results;
  end if;
end $$;
