create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  preferred_assistance text not null default 'learning' check (preferred_assistance in ('learning', 'none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  variant text not null default 'mcr' check (variant = 'mcr'),
  assistance_mode text not null check (assistance_mode in ('learning', 'none')),
  status text not null check (status in ('active', 'completed', 'abandoned')),
  state_version integer not null check (state_version > 0),
  state_json jsonb not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb,
  final_score jsonb
);

create unique index if not exists game_sessions_one_active_per_user on public.game_sessions(user_id) where status = 'active';
create index if not exists game_sessions_user_updated_idx on public.game_sessions(user_id, updated_at desc);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  session_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_user_idx on public.analytics_events(user_id) where user_id is not null;

alter table public.profiles enable row level security;
alter table public.game_sessions enable row level security;
alter table public.analytics_events enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "game_sessions_select_own" on public.game_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "game_sessions_insert_own" on public.game_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "game_sessions_update_own" on public.game_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Telemetry is deliberately insert-only from clients. It is untrusted input
-- and must never be used for authorization, payments, or security decisions.
create policy "analytics_insert_guest" on public.analytics_events for insert to anon with check (user_id is null);
create policy "analytics_insert_authenticated" on public.analytics_events for insert to authenticated with check (user_id is null or (select auth.uid()) = user_id);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.game_sessions to authenticated;
grant insert on public.analytics_events to anon, authenticated;
revoke select, update, delete on public.analytics_events from anon, authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute procedure public.handle_new_user_profile();
