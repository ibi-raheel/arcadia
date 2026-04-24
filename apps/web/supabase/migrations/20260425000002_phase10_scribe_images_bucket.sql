-- Phase 10 · scribe-generated images bucket (2026-04-25)
--
-- AI-generated images run larger than the 2 MB cap on
-- `course-thumbnails`, so they get their own bucket with a 5 MB
-- ceiling. Public-read like the thumbnails bucket — generated
-- thumbnails + lesson illustrations are surfaced on the academy
-- / market and a public URL is the cleanest path.
--
-- Path convention: {creator_id}/{draft_id}/{image_id}.png

set search_path = public;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-generated-images',
  'course-generated-images',
  true,
  5 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_generated_images_public_read" on storage.objects;
create policy "course_generated_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'course-generated-images');

drop policy if exists "course_generated_images_owner_insert" on storage.objects;
create policy "course_generated_images_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'course-generated-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "course_generated_images_owner_update" on storage.objects;
create policy "course_generated_images_owner_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'course-generated-images' and owner = auth.uid())
  with check (bucket_id = 'course-generated-images' and owner = auth.uid());

drop policy if exists "course_generated_images_owner_delete" on storage.objects;
create policy "course_generated_images_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'course-generated-images' and owner = auth.uid());
