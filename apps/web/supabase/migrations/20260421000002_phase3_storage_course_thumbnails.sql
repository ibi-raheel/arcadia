-- Arcadia MVP — Phase 3 Week 9 Step 2
-- Supabase Storage bucket for course thumbnail images.
--
-- Design:
--   - Bucket `course-thumbnails` with public read (no signing needed for
--     cards in /academy + /market; thumbnails aren't secret).
--   - 2 MB per-file ceiling enforced by `file_size_limit`.
--   - MIME whitelist (jpeg, png, webp) enforced by `allowed_mime_types`.
--   - Write/delete RLS: object.owner = auth.uid() so a creator can only
--     manage their own uploads. Uploaded path convention (enforced
--     client-side): `<member_id>/<course_id>.<ext>`.
--
-- Safe to re-run — uses upsert / IF EXISTS / drop-and-recreate patterns.

-- 1. Bucket ----------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-thumbnails',
  'course-thumbnails',
  true,
  2 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public              = excluded.public,
  file_size_limit     = excluded.file_size_limit,
  allowed_mime_types  = excluded.allowed_mime_types;

-- 2. RLS policies on storage.objects ---------------------------------------

-- Public read. The bucket's `public = true` flag already enables
-- unauthenticated SELECT through the signed-url-less public URL; this
-- explicit policy makes the intent grep-able in migration history.
drop policy if exists "course_thumbnails_public_read" on storage.objects;
create policy "course_thumbnails_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'course-thumbnails');

-- Authenticated upload. Path convention: first folder segment must match
-- the uploader's auth.uid(), so users can't clobber each other's files.
-- storage.foldername() returns an array of path segments.
drop policy if exists "course_thumbnails_owner_insert" on storage.objects;
create policy "course_thumbnails_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'course-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner update. Supabase sets `owner` to auth.uid() automatically on
-- upload; checking owner on UPDATE is the cleanest owner-guard.
drop policy if exists "course_thumbnails_owner_update" on storage.objects;
create policy "course_thumbnails_owner_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'course-thumbnails' and owner = auth.uid())
  with check (bucket_id = 'course-thumbnails' and owner = auth.uid());

-- Owner delete.
drop policy if exists "course_thumbnails_owner_delete" on storage.objects;
create policy "course_thumbnails_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'course-thumbnails' and owner = auth.uid());
