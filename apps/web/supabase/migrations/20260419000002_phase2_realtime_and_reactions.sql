-- Arcadia MVP — Phase 2 Week 8
-- Enable Supabase Realtime publication on the two tables clients subscribe
-- to in Phase 2, and lock reaction writes behind a tight RPC.
--
-- Tables added to realtime:
--   tavern_messages — chat INSERTs + reaction UPDATEs broadcast
--   memberships     — XP leaderboard live-refresh + Phase-5 UPDATE_LEVEL path
--
-- Reactions API:
--   The chat_react UPDATE policy from Phase 0 let authenticated users touch
--   any column on a tavern_messages row as long as they were in the same
--   realm. This dropped it and forces all reaction changes through
--   `toggle_reaction(message_id, emoji)` — a SECURITY DEFINER RPC that
--   only flips auth.uid() in the reactions JSONB array and can't touch
--   any other column.

-- 1. Realtime publication ---------------------------------------------------

alter publication supabase_realtime add table public.tavern_messages;
alter publication supabase_realtime add table public.memberships;

-- 2. Lock direct writes on tavern_messages ---------------------------------

-- Drop the permissive reaction UPDATE policy from Phase 0. With this policy
-- gone, no RLS policy covers UPDATE on tavern_messages for authenticated —
-- the role has no path to mutate rows except through the RPC below.
drop policy if exists chat_react on public.tavern_messages;

-- Belt-and-braces: revoke the UPDATE privilege from the authenticated role
-- entirely, so even a future policy that inadvertently opens UPDATE would
-- be blocked at the GRANT layer.
revoke update on public.tavern_messages from authenticated;

-- 3. Toggle-reaction RPC ----------------------------------------------------

-- Flips auth.uid() into / out of reactions->>emoji for the target message.
-- Security model:
--   * SECURITY DEFINER — runs as the migration owner, bypassing RLS so we
--     can read the row's realm_id without needing a SELECT policy carveout.
--   * Checks caller membership in the message's realm before mutating.
--   * Only rewrites the `reactions` column. No other column is touched.
--   * Raises an auth-insufficient error when the caller isn't authenticated
--     or is not a member of the message's realm.
-- Returns the updated reactions JSONB so the caller can render optimistically.
create or replace function public.toggle_reaction(
  p_message_id uuid,
  p_emoji      text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_realm  uuid;
  v_reactions jsonb;
  v_users     jsonb;
  v_caller_str text;
begin
  if v_caller is null then
    raise exception 'toggle_reaction: no authenticated user' using errcode = '42501';
  end if;

  -- Trim + normalise emoji to guard against invisible whitespace / empty key
  -- issues (JSONB treats '' as a valid key, which would silently grow).
  if p_emoji is null or length(trim(p_emoji)) = 0 then
    raise exception 'toggle_reaction: empty emoji' using errcode = '22023';
  end if;
  p_emoji := trim(p_emoji);

  -- Read the target row's realm + reactions. This is the only read the
  -- function does on the message row; no other column comes into scope.
  select realm_id, coalesce(reactions, '{}'::jsonb)
    into v_realm, v_reactions
  from public.tavern_messages
  where id = p_message_id;

  if not found then
    raise exception 'toggle_reaction: message not found' using errcode = 'P0002';
  end if;

  -- Verify membership — caller must be in the same realm as the message.
  if not exists (
    select 1 from public.memberships
    where member_id = v_caller and realm_id = v_realm
  ) then
    raise exception 'toggle_reaction: not a member of this realm' using errcode = '42501';
  end if;

  v_caller_str := v_caller::text;
  v_users := coalesce(v_reactions -> p_emoji, '[]'::jsonb);

  -- Toggle caller's uuid in the emoji's user list.
  if v_users ? v_caller_str then
    -- Remove — rebuild the array without the caller's id.
    v_users := coalesce(
      (select jsonb_agg(value) from jsonb_array_elements(v_users) where value <> to_jsonb(v_caller_str)),
      '[]'::jsonb
    );
  else
    -- Add — append caller's id to the end.
    v_users := v_users || to_jsonb(v_caller_str);
  end if;

  -- Prune empty emoji keys so client-side reaction counts stay clean.
  if jsonb_array_length(v_users) = 0 then
    v_reactions := v_reactions - p_emoji;
  else
    v_reactions := jsonb_set(v_reactions, array[p_emoji], v_users, true);
  end if;

  update public.tavern_messages
    set reactions = v_reactions
    where id = p_message_id;

  return v_reactions;
end;
$$;

-- Grant execute to authenticated. anon still can't call it (no auth.uid()
-- would trigger the 42501 raise at the top of the function, but revoking
-- from anon at the grant layer is tidier).
revoke execute on function public.toggle_reaction(uuid, text) from public;
grant execute on function public.toggle_reaction(uuid, text) to authenticated;

-- 4. Note ----- -----------------------------------------------------------
-- chat_read + chat_write policies from Phase 0 are untouched. SELECT and
-- INSERT remain open to realm members; only UPDATE is locked down now.
