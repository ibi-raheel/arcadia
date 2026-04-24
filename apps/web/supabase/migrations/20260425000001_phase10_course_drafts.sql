-- Phase 10 · AI course maker — the scribe's workbench (2026-04-25)
--
-- Adds:
--   course_drafts            — per-creator draft state machine for the
--                              staged generation ritual (satchel →
--                              outline → lessons → images → sealed).
--   course-draft-sources     — Supabase Storage bucket for uploaded
--                              source documents (PDF / DOCX / TXT).
--
-- RLS mirrors the creator-dashboard pattern (see
-- 20260421000001_phase3_courses_lessons_progress.sql):
--   - read + write restricted to creator_id = auth.uid()
--   - creator_id must be set to auth.uid() on insert
--
-- Migration is idempotent (IF NOT EXISTS + drop-policy-first) so
-- re-running is safe.
--
-- Non-idempotent bits to watch for on re-runs: the storage bucket
-- upsert uses `on conflict do update`, so this is safe too.

set search_path = public;

-- 1. course_drafts table -------------------------------------------------

create table if not exists public.course_drafts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  realm_id uuid not null references public.realms(id),

  -- Title arrives once the outline is approved; null during satchel +
  -- initial prompt stages.
  title text,

  -- Creator's original brief (e.g. "course on beekeeping for beginners").
  -- Kept for revise steps + audit.
  user_prompt text not null default '',

  -- State machine. `satchel` → `outline` → `lessons` → `images` →
  -- `ready` → `sealed`. See phases/phase-10_plan.md for stage contracts.
  stage text not null default 'satchel' check (
    stage in ('satchel', 'outline', 'lessons', 'images', 'ready', 'sealed')
  ),

  -- Outline shape: array of { id, title, lessons: [{id, title}] }.
  outline jsonb not null default '[]'::jsonb,

  -- Sources shape: array of { id, filename, char_count, text }.
  -- Kept in the row so stage prompts can concat without a second fetch.
  -- Hard cap on total text enforced app-side (ADR 0012: 600k chars).
  sources jsonb not null default '[]'::jsonb,

  -- Lessons shape: array of { section_id, lesson_id, body_markdown,
  -- approved: boolean }.
  lessons jsonb not null default '[]'::jsonb,

  -- Images shape: array of { target: 'thumbnail' | lesson_id, url,
  -- prompt, approved: boolean }.
  images jsonb not null default '[]'::jsonb,

  -- Running token counter for cost budgeting. Updated after every
  -- stream closes. Hard cap enforced in app/_actions/scribe.ts.
  tokens_used integer not null default 0,

  -- Set to the new courses.id row when sealDraft() materializes the
  -- draft. Lets us link back from a published course to its draft.
  sealed_course_id uuid references public.courses(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_drafts_creator_idx
  on public.course_drafts (creator_id, updated_at desc);
create index if not exists course_drafts_stage_idx
  on public.course_drafts (creator_id, stage);

-- 2. RLS -----------------------------------------------------------------

alter table public.course_drafts enable row level security;

-- Read: creator only.
drop policy if exists course_drafts_creator_read on public.course_drafts;
create policy course_drafts_creator_read on public.course_drafts
  for select
  using (creator_id = auth.uid());

-- Insert: creator_id must be self + creator role check in-app; RLS
-- enforces the self part.
drop policy if exists course_drafts_creator_insert on public.course_drafts;
create policy course_drafts_creator_insert on public.course_drafts
  for insert
  with check (creator_id = auth.uid() and public.user_has_creator_role());

-- Update: creator only.
drop policy if exists course_drafts_creator_update on public.course_drafts;
create policy course_drafts_creator_update on public.course_drafts
  for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- Delete: creator only.
drop policy if exists course_drafts_creator_delete on public.course_drafts;
create policy course_drafts_creator_delete on public.course_drafts
  for delete
  using (creator_id = auth.uid());

-- 3. Storage bucket for source docs -------------------------------------

-- Private bucket. Path convention enforced by RLS below:
-- {creator_id}/{draft_id}/{filename}. 10 MB per-file cap, MIME whitelist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-draft-sources',
  'course-draft-sources',
  false,
  10 * 1024 * 1024,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update set
  public              = excluded.public,
  file_size_limit     = excluded.file_size_limit,
  allowed_mime_types  = excluded.allowed_mime_types;

-- Owner-only read.
drop policy if exists "course_draft_sources_owner_read" on storage.objects;
create policy "course_draft_sources_owner_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'course-draft-sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-only insert — path must start with auth.uid().
drop policy if exists "course_draft_sources_owner_insert" on storage.objects;
create policy "course_draft_sources_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'course-draft-sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner update.
drop policy if exists "course_draft_sources_owner_update" on storage.objects;
create policy "course_draft_sources_owner_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'course-draft-sources' and owner = auth.uid())
  with check (bucket_id = 'course-draft-sources' and owner = auth.uid());

-- Owner delete.
drop policy if exists "course_draft_sources_owner_delete" on storage.objects;
create policy "course_draft_sources_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'course-draft-sources' and owner = auth.uid());

-- 4. Updated-at trigger (cheap correctness) -----------------------------

create or replace function public.course_drafts_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_course_drafts_touch on public.course_drafts;
create trigger trg_course_drafts_touch
  before update on public.course_drafts
  for each row execute function public.course_drafts_touch_updated_at();
