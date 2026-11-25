-- Initial schema for riftbound-sim. See issue #1 for the design.
--
-- Access model:
--   * Browsers (role `authenticated`) touch only profiles, decks, and their own match history.
--   * cards, catalog_meta, and allowed_users have RLS enabled and no policies, so only the
--     service role (seed script, match server) can read or write them. Browsers get the card
--     catalog through the Worker's cached endpoint, never from Postgres.

-- ---------------------------------------------------------------------------
-- Private test deployment: sign-up allowlist
-- ---------------------------------------------------------------------------

create table public.allowed_users (
  email text primary key check (email = lower(email)),
  note text,
  created_at timestamptz not null default now()
);
alter table public.allowed_users enable row level security;

-- Supabase Auth calls this before creating a user (configured in supabase/config.toml and,
-- for hosted projects, under Authentication > Hooks). Returning an error rejects the sign-up.
create function public.hook_restrict_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_email text := lower(event -> 'user' ->> 'email');
begin
  if signup_email is not null
     and exists (select 1 from public.allowed_users where email = signup_email) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This is a private test deployment. Ask the owner to add your email.'
    )
  );
end;
$$;

revoke execute on function public.hook_restrict_signup(jsonb) from public, anon, authenticated;
grant execute on function public.hook_restrict_signup(jsonb) to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Signed-in users can read profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Creates the profile from the Google account details. The avatar stays a Google URL,
-- so no Supabase Storage is used.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      'Player'
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Card catalog (seeded from RiftHunt by `pnpm db:seed`; one row per printing)
-- ---------------------------------------------------------------------------

create table public.cards (
  printing_id uuid primary key,
  oracle_id uuid not null,
  name text not null,
  type text not null,
  supertype text,
  domains text[] not null default '{}',
  energy integer,
  power integer,
  might integer,
  keywords text[] not null default '{}',
  tags text[] not null default '{}',
  rules_text text,
  rules_html text,
  set_code text not null,
  collector_number text not null,
  rarity text,
  variant text,
  orientation text,
  artist text,
  legalities jsonb,
  image_small text,
  image_normal text,
  image_large text,
  image_back text,
  image_source text,
  content_hash text not null,
  updated_at timestamptz not null default now()
);
create index cards_oracle_id_idx on public.cards (oracle_id);
alter table public.cards enable row level security;

-- Single-row table. `version` changes only when card data actually changes, which is what
-- lets the Worker and browsers cache the catalog indefinitely per version.
create table public.catalog_meta (
  id boolean primary key default true check (id),
  version text,
  updated_at timestamptz not null default now()
);
insert into public.catalog_meta default values;
alter table public.catalog_meta enable row level security;

-- ---------------------------------------------------------------------------
-- Decks (card ids only; card details are joined in the browser from the cached catalog)
-- ---------------------------------------------------------------------------

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  cards uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index decks_owner_id_idx on public.decks (owner_id);
alter table public.decks enable row level security;

create policy "Users manage their own decks"
  on public.decks for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- Finished matches (written once by the match server when a match ends)
-- ---------------------------------------------------------------------------

create table public.matches (
  id uuid primary key,
  player_one uuid not null references auth.users (id) on delete cascade,
  player_two uuid not null references auth.users (id) on delete cascade,
  winner uuid references auth.users (id) on delete set null,
  seed bigint not null,
  turns integer not null,
  finished_at timestamptz not null default now()
);
create index matches_player_one_idx on public.matches (player_one, finished_at desc);
create index matches_player_two_idx on public.matches (player_two, finished_at desc);
alter table public.matches enable row level security;

create policy "Players can read their own matches"
  on public.matches for select to authenticated
  using ((select auth.uid()) in (player_one, player_two));

-- One row per match so a replay costs one read, and only when someone opens it.
create table public.match_replays (
  match_id uuid primary key references public.matches (id) on delete cascade,
  setup jsonb not null,
  actions jsonb not null
);
alter table public.match_replays enable row level security;

create policy "Players can read replays of their own matches"
  on public.match_replays for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (select auth.uid()) in (m.player_one, m.player_two)
    )
  );
