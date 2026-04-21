-- Arcadia MVP — Phase 3 Week 10 Step 13
-- Any member who has SELECT access to a lesson (preview, enrolled, or
-- creator) can capture its duration from the YouTube IFrame API on first
-- successful play. lessons.duration_sec UPDATE is otherwise creator-only
-- per the Week-9 RLS; this RPC is the one sanctioned viewer-side write
-- and it only fires when duration_sec IS NULL (first setter wins).

create or replace function public.set_lesson_duration(p_lesson_id uuid, p_duration integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_duration is null or p_duration < 0 then
    raise exception 'invalid duration: %', p_duration;
  end if;

  update public.lessons
  set duration_sec = p_duration
  where id = p_lesson_id
    and duration_sec is null
    and (
      is_preview = true
      or course_id in (select course_id from public.enrolments where member_id = auth.uid())
      or course_id in (select id from public.courses where creator_id = auth.uid())
    );
end;
$$;

grant execute on function public.set_lesson_duration(uuid, integer) to authenticated;

comment on function public.set_lesson_duration(uuid, integer) is
  'First-set-wins writer for lessons.duration_sec. Called by the member-side video viewer once per lesson on YouTube onReady; no-op on subsequent calls. ADR 0006 — YouTube-unlisted demo era.';
