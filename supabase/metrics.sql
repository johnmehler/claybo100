-- Lightweight user tracking schema for math-games (onlinemath.games)
-- Run this once in the Supabase SQL Editor (same project as campaign-game).

-- 1. Browser / visitor sessions (one row per tab session)
create table if not exists public.mg_sessions (
    id uuid primary key,
    player_id text not null,
    started_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    ended_at timestamptz,
    page_views integer not null default 0,
    games_opened integer not null default 0,
    is_mobile boolean not null default false,
    referrer text,
    country text,
    region text,
    city text
);

create index if not exists idx_mg_sessions_started_at on public.mg_sessions (started_at desc);
create index if not exists idx_mg_sessions_player_id on public.mg_sessions (player_id);

-- 2. Page views and game visits (with duration tracking)
create table if not exists public.mg_events (
    id bigint generated always as identity primary key,
    visit_id uuid unique,
    session_id uuid references public.mg_sessions(id) on delete set null,
    player_id text not null,
    event_type text not null,
    path text not null,
    game_id text,
    duration_seconds integer,
    created_at timestamptz not null default now(),
    ended_at timestamptz
);

create index if not exists idx_mg_events_created_at on public.mg_events (created_at desc);
create index if not exists idx_mg_events_session_id on public.mg_events (session_id);
create index if not exists idx_mg_events_game_id on public.mg_events (game_id) where game_id is not null;

-- 3. Atomic counter helper
create or replace function public.increment_mg_session_counters(
    p_session_id uuid,
    p_page_views_delta integer default 0,
    p_games_opened_delta integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.mg_sessions
    set
        page_views = page_views + p_page_views_delta,
        games_opened = games_opened + p_games_opened_delta,
        last_seen_at = now(),
        ended_at = null
    where id = p_session_id;
end;
$$;

-- 4. RLS policies (matches campaign-game's PUBLIC_SUPABASE_ANON_KEY pattern)
alter table public.mg_sessions enable row level security;
alter table public.mg_events enable row level security;

drop policy if exists "Allow anon select mg_sessions" on public.mg_sessions;
create policy "Allow anon select mg_sessions"
    on public.mg_sessions for select
    to anon, authenticated
    using (true);

drop policy if exists "Allow anon insert mg_sessions" on public.mg_sessions;
create policy "Allow anon insert mg_sessions"
    on public.mg_sessions for insert
    to anon, authenticated
    with check (true);

drop policy if exists "Allow anon update mg_sessions" on public.mg_sessions;
create policy "Allow anon update mg_sessions"
    on public.mg_sessions for update
    to anon, authenticated
    using (true)
    with check (true);

drop policy if exists "Allow anon select mg_events" on public.mg_events;
create policy "Allow anon select mg_events"
    on public.mg_events for select
    to anon, authenticated
    using (true);

drop policy if exists "Allow anon insert mg_events" on public.mg_events;
create policy "Allow anon insert mg_events"
    on public.mg_events for insert
    to anon, authenticated
    with check (true);

drop policy if exists "Allow anon update mg_events" on public.mg_events;
create policy "Allow anon update mg_events"
    on public.mg_events for update
    to anon, authenticated
    using (true)
    with check (true);

-- 5. Summary views for checking stats in Supabase
create or replace view public.mg_daily_summary
with (security_invoker = true) as
select
    date_trunc('day', s.started_at)::date as day,
    count(distinct s.id) as sessions,
    count(distinct s.player_id) as unique_users,
    coalesce(sum(s.page_views), 0) as page_views,
    coalesce(sum(s.games_opened), 0) as games_opened,
    round(
        avg(extract(epoch from (coalesce(s.ended_at, s.last_seen_at) - s.started_at))),
        1
    ) as avg_session_seconds
from public.mg_sessions s
group by 1
order by 1 desc;

create or replace view public.mg_game_stats
with (security_invoker = true) as
select
    game_id,
    count(distinct player_id) as unique_users,
    count(*) as total_plays,
    round(avg(duration_seconds) filter (where duration_seconds is not null), 1) as avg_time_seconds,
    coalesce(sum(duration_seconds), 0) as total_time_seconds,
    max(created_at) as last_played_at
from public.mg_events
where event_type = 'game_open' and game_id is not null
group by 1
order by unique_users desc, total_plays desc;
