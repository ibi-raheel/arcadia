-- Arcadia MVP — RLS policies (TAD §6.2, full coverage)
-- Every table has RLS enabled. Every SELECT / INSERT / UPDATE that clients
-- can perform is covered. Cross-member leakage test (Phase 0 exit) asserts
-- nothing slips through.

-- Enable RLS on every table. This BLOCKS all access by default; the policies
-- below are the only openings.
alter table public.realms           enable row level security;
alter table public.memberships      enable row level security;
alter table public.courses          enable row level security;
alter table public.sections         enable row level security;
alter table public.lessons          enable row level security;
alter table public.lesson_progress  enable row level security;
alter table public.enrolments       enable row level security;
alter table public.tavern_messages  enable row level security;

-- realms: any authenticated member can read the realm row they belong to.
-- Writes are service-role only (not exposed via RLS).
create policy realm_member_read on public.realms
  for select to authenticated
  using (
    id in (select realm_id from public.memberships where member_id = auth.uid())
  );

-- memberships:
--   read: own row, or any row in the same realm (leaderboard / presence).
--   update: own row only (display_name, avatar_id).
--   insert / delete: service role only — handled by the signup trigger.
create policy membership_self_or_same_realm_read on public.memberships
  for select to authenticated
  using (
    member_id = auth.uid()
    or realm_id in (select realm_id from public.memberships where member_id = auth.uid())
  );

create policy membership_self_update on public.memberships
  for update to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- courses: realm members read; no client writes (creator writes via server).
create policy course_member_read on public.courses
  for select to authenticated
  using (
    realm_id in (select realm_id from public.memberships where member_id = auth.uid())
  );

-- sections: readable iff the parent course is readable (chained via courses RLS).
create policy section_member_read on public.sections
  for select to authenticated
  using (course_id in (select id from public.courses));

-- lessons: preview lessons are open; otherwise member must be enrolled.
create policy lesson_access on public.lessons
  for select to authenticated
  using (
    is_preview = true
    or course_id in (select course_id from public.enrolments where member_id = auth.uid())
  );

-- lesson_progress: own rows only. Insert and update checked against auth.uid().
create policy progress_self_read on public.lesson_progress
  for select to authenticated
  using (member_id = auth.uid());

create policy progress_self_write on public.lesson_progress
  for insert to authenticated
  with check (member_id = auth.uid());

create policy progress_self_update on public.lesson_progress
  for update to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- enrolments: own rows readable; inserts via service role only.
create policy enrolment_self_read on public.enrolments
  for select to authenticated
  using (member_id = auth.uid());

-- tavern_messages: same-realm members read; members of the realm send; reactions
-- updated via an RPC that restricts writes to the reactions column only (the
-- RPC is added when Phase 2 ships — the RLS update policy below only gates
-- the realm membership check).
create policy chat_read on public.tavern_messages
  for select to authenticated
  using (
    realm_id in (select realm_id from public.memberships where member_id = auth.uid())
  );

create policy chat_write on public.tavern_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and realm_id in (select realm_id from public.memberships where member_id = auth.uid())
  );

create policy chat_react on public.tavern_messages
  for update to authenticated
  using (
    realm_id in (select realm_id from public.memberships where member_id = auth.uid())
  )
  with check (
    realm_id in (select realm_id from public.memberships where member_id = auth.uid())
  );
