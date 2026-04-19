-- Phase 0 — fix RLS infinite recursion surfaced by Step 17 leakage suite
--
-- Original policies (migration 20260418000003) embedded subqueries of the
-- form `SELECT realm_id FROM memberships WHERE member_id = auth.uid()` in
-- their USING clauses. Postgres re-applies the relevant policy to the
-- subquery; when the subquery hits memberships, the memberships policy
-- re-evaluates the same subquery — Postgres bails with
-- `42P17: infinite recursion detected in policy for relation "memberships"`.
--
-- Fix: pull the lookup into a SECURITY DEFINER function. The function runs
-- with the creator's privileges so RLS is not re-applied inside its body,
-- but it still reads `auth.uid()` at call time so an unauthenticated caller
-- gets an empty set back.
--
-- Every policy that previously hand-wrote
--   `SELECT realm_id FROM memberships WHERE member_id = auth.uid()`
-- now reads `SELECT public.user_realm_ids()` instead.

create or replace function public.user_realm_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select realm_id from public.memberships where member_id = auth.uid();
$$;

-- Realms — read own realm row.
drop policy if exists realm_member_read on public.realms;
create policy realm_member_read on public.realms
  for select to authenticated
  using (id in (select public.user_realm_ids()));

-- Memberships — self or same-realm.
drop policy if exists membership_self_or_same_realm_read on public.memberships;
create policy membership_self_or_same_realm_read on public.memberships
  for select to authenticated
  using (
    member_id = auth.uid()
    or realm_id in (select public.user_realm_ids())
  );

-- Courses — same-realm members read.
drop policy if exists course_member_read on public.courses;
create policy course_member_read on public.courses
  for select to authenticated
  using (realm_id in (select public.user_realm_ids()));

-- Tavern messages — read / write / react, all scoped to the sender's realm.
drop policy if exists chat_read on public.tavern_messages;
create policy chat_read on public.tavern_messages
  for select to authenticated
  using (realm_id in (select public.user_realm_ids()));

drop policy if exists chat_write on public.tavern_messages;
create policy chat_write on public.tavern_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and realm_id in (select public.user_realm_ids())
  );

drop policy if exists chat_react on public.tavern_messages;
create policy chat_react on public.tavern_messages
  for update to authenticated
  using (realm_id in (select public.user_realm_ids()))
  with check (realm_id in (select public.user_realm_ids()));
