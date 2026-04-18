-- Arcadia MVP — signup hook (TAD §6.3)
-- Auto-create a memberships row in the MVP Realm whenever a new auth.users
-- row is inserted. avatar_id stays NULL until the /onboarding/avatar picker
-- completes; the app routes to that picker on any login where avatar_id is NULL.

create or replace function public.create_membership_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_realm_id uuid;
begin
  select id into v_realm_id from public.realms where slug = 'mvp-realm' limit 1;

  -- Defensive: abort signup with a clear error rather than silently skipping
  -- membership creation if the MVP realm is missing.
  if v_realm_id is null then
    raise exception 'Arcadia signup hook: realm with slug=mvp-realm not found';
  end if;

  insert into public.memberships (realm_id, member_id, display_name)
  values (v_realm_id, new.id, split_part(new.email, '@', 1));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_membership_on_signup();
