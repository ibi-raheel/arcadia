-- Arcadia MVP — Phase 3, decision A revised 2026-04-20
-- Gate /dashboard (course-creation flow) behind a role on memberships.
--
-- Roles:
--   member   — default; everyone starts here.
--   creator  — can create + edit courses in their realm.
--   admin    — same powers as creator for now; future distinction reserved
--              for cross-realm moderation / platform-level actions.
--
-- The helper function user_has_creator_role() returns true if the caller
-- has at least 'creator'. Reused by courses.course_creator_insert so the
-- policy has one authoritative definition of "who can author".

-- 1. Role column -----------------------------------------------------------

alter table public.memberships
  add column if not exists role text not null default 'member'
    check (role in ('member', 'creator', 'admin'));

create index if not exists memberships_role_idx
  on public.memberships(member_id, role);

-- 2. Helper — is the caller a creator-or-above? ----------------------------

create or replace function public.user_has_creator_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where member_id = auth.uid()
      and role in ('creator', 'admin')
  )
$$;

grant execute on function public.user_has_creator_role() to authenticated;

comment on function public.user_has_creator_role() is
  'True if the current auth.uid() has role creator or admin on any membership. Used by course INSERT RLS to gate /dashboard writes.';

-- 3. Tighten course INSERT -------------------------------------------------

-- Previous course_creator_insert (migration 20260421000001) allowed any
-- authenticated user in the realm. Now we additionally require creator
-- role. UPDATE / DELETE policies are unchanged — once a course exists,
-- its creator_id is the owner check.
drop policy if exists course_creator_insert on public.courses;
create policy course_creator_insert
  on public.courses
  for insert
  to authenticated
  with check (
    creator_id = auth.uid()
    and realm_id in (select user_realm_ids())
    and public.user_has_creator_role()
  );
