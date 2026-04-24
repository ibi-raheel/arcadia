-- Phase 9 · async feed + live events (2026-04-24)
--
-- Adds two tables:
--   posts   — async feed entries surfaced at the tablet in the tavern
--             ("what happened while you were away"). Creator/admin can
--             post; every member in the realm can read.
--   events  — live in-world events (Q&A, office hours, cohort kickoff)
--             scheduled by creators. When the current time is in the
--             event window, the tavern swaps the bar-screen object for
--             a YouTube iframe at `stream_url` and a verdigris banner
--             tells members the event is live.
--
-- RLS mirrors the courses + memberships pattern:
--   - read scoped to members-of-the-same-realm
--   - write restricted to creators/admins via user_has_creator_role()
--
-- Migration is idempotent (IF NOT EXISTS) so it's safe to re-run; drop
-- + recreate is NOT safe because the app reads them once they exist.

set search_path = public;

-- 1. Posts --------------------------------------------------------------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  realm_id uuid not null references public.realms(id),
  author_id uuid not null references auth.users(id) on delete cascade,
  -- `text`  — a free-form post from the creator.
  -- `announcement` — same but styled with a wax accent.
  -- `event-created` — auto-generated when a creator schedules an event;
  --                   metadata.event_id holds the event uuid so the
  --                   feed row can link into the event card.
  kind text not null check (kind in ('text', 'announcement', 'event-created')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_realm_time_idx
  on public.posts (realm_id, created_at desc);

-- 2. Events -------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  realm_id uuid not null references public.realms(id),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  -- YouTube live URL or embeddable video. Null allowed so the creator
  -- can schedule the event before knowing the stream link.
  stream_url text,
  -- Which building the event will happen in. Defaults to the first
  -- tavern; creators can point at any `tavern-a/b/c` shard.
  location text not null default 'tavern-a',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_realm_time_idx
  on public.events (realm_id, starts_at desc);
-- Supports the "is an event live right now?" query without a seqscan
-- once the table has real volume.
create index if not exists events_live_idx
  on public.events (realm_id, starts_at, ends_at);

-- 3. RLS ----------------------------------------------------------------

alter table public.posts enable row level security;
alter table public.events enable row level security;

-- Posts · read: any member in the realm.
drop policy if exists posts_realm_read on public.posts;
create policy posts_realm_read on public.posts
  for select
  using (
    exists (
      select 1 from public.memberships
      where member_id = auth.uid() and realm_id = posts.realm_id
    )
  );

-- Posts · insert: creator or admin; author_id must be self.
drop policy if exists posts_creator_insert on public.posts;
create policy posts_creator_insert on public.posts
  for insert
  with check (
    author_id = auth.uid()
    and public.user_has_creator_role()
  );

-- Posts · update: creator can edit their own posts only.
drop policy if exists posts_creator_update on public.posts;
create policy posts_creator_update on public.posts
  for update
  using (author_id = auth.uid() and public.user_has_creator_role())
  with check (author_id = auth.uid());

-- Posts · delete: creator can delete their own posts only.
drop policy if exists posts_creator_delete on public.posts;
create policy posts_creator_delete on public.posts
  for delete
  using (author_id = auth.uid() and public.user_has_creator_role());

-- Events · read: any member in the realm.
drop policy if exists events_realm_read on public.events;
create policy events_realm_read on public.events
  for select
  using (
    exists (
      select 1 from public.memberships
      where member_id = auth.uid() and realm_id = events.realm_id
    )
  );

-- Events · insert: creator or admin; creator_id must be self.
drop policy if exists events_creator_insert on public.events;
create policy events_creator_insert on public.events
  for insert
  with check (
    creator_id = auth.uid()
    and public.user_has_creator_role()
  );

-- Events · update: creator can edit their own events only.
drop policy if exists events_creator_update on public.events;
create policy events_creator_update on public.events
  for update
  using (creator_id = auth.uid() and public.user_has_creator_role())
  with check (creator_id = auth.uid());

-- Events · delete: creator can delete their own events only.
drop policy if exists events_creator_delete on public.events;
create policy events_creator_delete on public.events
  for delete
  using (creator_id = auth.uid() and public.user_has_creator_role());
