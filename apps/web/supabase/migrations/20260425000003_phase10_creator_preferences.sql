-- Phase 10.10 · scribe personalization (2026-04-25)
--
-- Per-creator preferences the scribe reads at every stage — voice,
-- image style, audience. One row per creator. Persists across drafts
-- so the scribe's voice stays consistent as the creator builds their
-- body of work.
--
-- Not stored on memberships because preferences are creator-scoped,
-- not realm-scoped: one creator = one voice across all their realms.

set search_path = public;

create table if not exists public.creator_preferences (
  creator_id uuid primary key references auth.users(id) on delete cascade,

  -- Free-form text the scribe injects into every text prompt under
  -- "the creator's teaching voice". Examples: "plain-spoken, short
  -- sentences, concrete before abstract, no jargon without
  -- immediate definition."
  voice_guide text,

  -- Appended to IMAGE_STYLE_PREAMBLE for every image prompt.
  -- Examples: "muted palette, no human faces, prefer verdigris and
  -- oxblood accents over bright saturation."
  image_style text,

  -- Free-form audience description. Examples: "working
  -- professionals changing careers, assumes high literacy but zero
  -- domain knowledge."
  audience text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: creator reads / writes their own row. No one else sees it.
alter table public.creator_preferences enable row level security;

drop policy if exists creator_prefs_self_read on public.creator_preferences;
create policy creator_prefs_self_read on public.creator_preferences
  for select
  using (creator_id = auth.uid());

drop policy if exists creator_prefs_self_insert on public.creator_preferences;
create policy creator_prefs_self_insert on public.creator_preferences
  for insert
  with check (creator_id = auth.uid() and public.user_has_creator_role());

drop policy if exists creator_prefs_self_update on public.creator_preferences;
create policy creator_prefs_self_update on public.creator_preferences
  for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists creator_prefs_self_delete on public.creator_preferences;
create policy creator_prefs_self_delete on public.creator_preferences
  for delete
  using (creator_id = auth.uid());

-- Updated-at trigger — same function we use for course_drafts;
-- create our own variant to keep migration ownership local.
create or replace function public.creator_preferences_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_creator_preferences_touch on public.creator_preferences;
create trigger trg_creator_preferences_touch
  before update on public.creator_preferences
  for each row execute function public.creator_preferences_touch_updated_at();
