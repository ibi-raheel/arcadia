-- Arcadia MVP — Phase 5 Week 12
-- Gamification: lesson-completion XP trigger + shared level helpers.
-- Bundled polish: SECURITY DEFINER RPC for global enrolment counts
-- (Market stall cards need to see them across other members' rows).
--
-- Applied to arcadia-test ONLY in Phase 5 Step 1 per user decision
-- 2026-04-21. Prod migration lands only after local smoke is green.

-- =============================================================================
-- 1. Level calculation — shared between trigger and any future client math.
-- =============================================================================

-- 1/2/3/4/5 at XP thresholds 0/100/300/600/1000 per TAD §8.1.
-- IMMUTABLE so Postgres can inline the call inside award_xp.
create or replace function public.calculate_level(total_xp integer)
returns integer
language plpgsql
immutable
as $$
begin
  return case
    when total_xp >= 1000 then 5
    when total_xp >= 600  then 4
    when total_xp >= 300  then 3
    when total_xp >= 100  then 2
    else 1
  end;
end;
$$;

comment on function public.calculate_level(integer) is
  'Shared level-from-xp helper (TAD §8.1). 1 / 2 / 3 / 4 / 5 at 0 / 100 / 300 / 600 / 1000 XP.';

-- =============================================================================
-- 2. award_xp — centralised mutator every XP source calls.
-- =============================================================================

create or replace function public.award_xp(
  p_member_id uuid,
  p_realm_id  uuid,
  p_amount    integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    return;
  end if;

  update public.memberships
  set xp          = xp + p_amount,
      level       = public.calculate_level(xp + p_amount),
      last_active = now(),
      updated_at  = now()
  where member_id = p_member_id
    and realm_id  = p_realm_id;
end;
$$;

comment on function public.award_xp(uuid, uuid, integer) is
  'Centralised XP mutator (TAD §8.2). SECURITY DEFINER so trigger-based callers bypass the memberships UPDATE RLS that only allows self-writes. All XP sources must call this rather than updating memberships directly.';

grant execute on function public.award_xp(uuid, uuid, integer) to authenticated;

-- =============================================================================
-- 3. Lesson-completion trigger — only XP source in Phase 5 MVP.
-- =============================================================================

-- Fires on INSERT (first progress row) + UPDATE (existing row flipping to
-- completed=true). Guards against double-fire by requiring the transition.
-- realm_id looked up via the lesson's parent course so we don't trust the
-- caller to pass one.
create or replace function public.on_lesson_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_realm_id uuid;
begin
  if new.completed = true
     and (tg_op = 'INSERT' or coalesce(old.completed, false) = false)
  then
    select c.realm_id
      into v_realm_id
      from public.courses c
      join public.lessons l on l.course_id = c.id
     where l.id = new.lesson_id;

    if v_realm_id is not null then
      perform public.award_xp(new.member_id, v_realm_id, 25);
    end if;
  end if;

  return new;
end;
$$;

comment on function public.on_lesson_complete() is
  'Trigger body for lesson-completion XP. Awards +25 XP to the member for the completed=false → true transition (INSERT of a completed row also counts). TAD §8.2 Phase 5 MVP scope.';

drop trigger if exists trg_lesson_complete on public.lesson_progress;
create trigger trg_lesson_complete
  after insert or update on public.lesson_progress
  for each row
  execute function public.on_lesson_complete();

-- =============================================================================
-- 4. Bundled polish — global enrolment count RPC for the Market.
-- =============================================================================

-- `enrolment_self_read` RLS only permits the caller to see their own
-- enrolment rows. The Market wants to show "N enrolled" on every stall
-- card. SECURITY DEFINER function reads the count without exposing
-- individual rows. Only returns counts for published courses in the
-- caller's realm — same guard shape as `enrolment_self_insert`.
create or replace function public.get_enrolment_count(p_course_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count   integer;
  v_allowed boolean;
begin
  select exists (
    select 1
      from public.courses c
     where c.id = p_course_id
       and c.published = true
       and c.realm_id in (select user_realm_ids())
  )
  into v_allowed;

  if not v_allowed then
    return 0;
  end if;

  select count(*)
    into v_count
    from public.enrolments
   where course_id = p_course_id;

  return coalesce(v_count, 0);
end;
$$;

comment on function public.get_enrolment_count(uuid) is
  'SECURITY DEFINER global count for a published course visible to the caller. Returns 0 for unpublished / cross-realm courses rather than leaking existence. Used by /market stall cards per Phase-4 follow-up.';

grant execute on function public.get_enrolment_count(uuid) to authenticated;
