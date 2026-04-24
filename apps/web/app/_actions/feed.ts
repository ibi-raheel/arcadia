'use server';

// Server actions for the async feed + live-events surface.
//
// Reads happen in client components via useFetchOrMock; writes go
// through these server actions so RLS covers every mutation path:
//   - createPost    · creator-only per `posts_creator_insert`
//   - createEvent   · creator-only per `events_creator_insert`
//   - updateEvent   · own-event only per `events_creator_update`
//   - deleteEvent   · own-event only per `events_creator_delete`
//
// Every action returns a discriminated `{ ok: true, ... } | { ok: false, error }`
// result so the client can surface errors without guessing.

import { revalidatePath } from 'next/cache';

import type { FeedPost, FeedPostKind } from '@/lib/fixtures/feed';
import type { LiveEvent } from '@/lib/fixtures/events';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

const POST_BODY_MAX = 2_000;
const EVENT_TITLE_MAX = 140;
const EVENT_DESC_MAX = 2_000;

/**
 * Loads posts + events for the caller's realm and shapes them for the
 * feed UI. Events are surfaced as synthetic feed rows (kind
 * `event-created`) when their `created_at` is within the past 30 days
 * AND the event itself is upcoming or live — so members see
 * "scheduled Q&A" in the timeline the moment it's announced, and the
 * card still reads usefully after the scheduling post scrolls off.
 */
export async function loadFeed(): Promise<
  Result<{ readonly posts: readonly FeedPost[]; readonly events: readonly LiveEvent[] }>
> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not signed in' };

  // Realm lookup — every read is scoped to a single realm for MVP.
  const { data: membership } = await supabase
    .from('memberships')
    .select('realm_id, display_name')
    .eq('member_id', user.id)
    .maybeSingle();
  if (!membership?.realm_id) return { ok: false, error: 'no realm membership' };

  const [{ data: postRows }, { data: eventRows }, { data: authors }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, author_id, kind, body, metadata, created_at')
      .eq('realm_id', membership.realm_id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('events')
      .select(
        'id, creator_id, title, description, starts_at, ends_at, stream_url, location, created_at',
      )
      .eq('realm_id', membership.realm_id)
      .order('starts_at', { ascending: false })
      .limit(50),
    // Display names aren't joinable directly (memberships is per-realm);
    // fetch all distinct authors/creators in one round-trip.
    supabase
      .from('memberships')
      .select('member_id, display_name')
      .eq('realm_id', membership.realm_id),
  ]);

  const nameById = new Map<string, string>();
  for (const a of authors ?? []) {
    nameById.set(a.member_id, (a.display_name as string | null) ?? 'someone');
  }

  const posts: FeedPost[] = (postRows ?? []).map((r) => ({
    id: r.id,
    authorId: r.author_id,
    authorName: nameById.get(r.author_id) ?? 'someone',
    authorSeal: (nameById.get(r.author_id) ?? 'A').charAt(0).toUpperCase(),
    kind: (r.kind ?? 'text') as FeedPostKind,
    body: r.body,
    createdAt: r.created_at,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
  }));

  const events: LiveEvent[] = (eventRows ?? []).map((e) => ({
    id: e.id,
    creatorId: e.creator_id,
    creatorName: nameById.get(e.creator_id) ?? 'someone',
    title: e.title,
    description: e.description,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    streamUrl: e.stream_url,
    location: e.location ?? 'tavern-a',
  }));

  return { ok: true, value: { posts, events } };
}

/**
 * Loads only the events for the caller's realm — used by surfaces that
 * need the event list without the post timeline (e.g. the banner in
 * the tavern, the studio upcoming-event pill).
 */
export async function loadEvents(): Promise<Result<{ readonly events: readonly LiveEvent[] }>> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('realm_id')
    .eq('member_id', user.id)
    .maybeSingle();
  if (!membership?.realm_id) return { ok: false, error: 'no realm membership' };

  const [{ data: rows, error }, { data: authors }] = await Promise.all([
    supabase
      .from('events')
      .select('id, creator_id, title, description, starts_at, ends_at, stream_url, location')
      .eq('realm_id', membership.realm_id)
      .order('starts_at', { ascending: true })
      .limit(100),
    supabase
      .from('memberships')
      .select('member_id, display_name')
      .eq('realm_id', membership.realm_id),
  ]);

  if (error) return { ok: false, error: error.message };

  const nameById = new Map<string, string>();
  for (const a of authors ?? []) {
    nameById.set(a.member_id, (a.display_name as string | null) ?? 'someone');
  }

  const events: LiveEvent[] = (rows ?? []).map((e) => ({
    id: e.id,
    creatorId: e.creator_id,
    creatorName: nameById.get(e.creator_id) ?? 'someone',
    title: e.title,
    description: e.description,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    streamUrl: e.stream_url,
    location: e.location ?? 'tavern-a',
  }));

  return { ok: true, value: { events } };
}

/**
 * Creator posts a new feed entry. RLS does the real enforcement; this
 * just shapes the payload + bounces the client with a typed error.
 */
export async function createPost(input: {
  readonly body: string;
  readonly kind?: FeedPostKind;
}): Promise<Result<{ readonly id: string }>> {
  const body = (input.body ?? '').trim();
  if (body.length === 0) return { ok: false, error: 'body is empty' };
  if (body.length > POST_BODY_MAX) return { ok: false, error: `body over ${POST_BODY_MAX} chars` };

  const kind: FeedPostKind = input.kind ?? 'text';

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('realm_id, role')
    .eq('member_id', user.id)
    .maybeSingle();
  if (!membership?.realm_id) return { ok: false, error: 'no realm membership' };
  if (membership.role !== 'creator' && membership.role !== 'admin') {
    return { ok: false, error: 'only creators can post to the feed' };
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      realm_id: membership.realm_id,
      author_id: user.id,
      kind,
      body,
      metadata: {},
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath('/tavern');
  revalidatePath('/dashboard');
  return { ok: true, value: { id: data.id } };
}

/** Creator schedules a new event. Also auto-posts an `event-created`
 *  feed row so members see it show up in the timeline immediately. */
export async function createEvent(input: {
  readonly title: string;
  readonly description?: string | null;
  readonly startsAt: string; // ISO
  readonly endsAt: string; // ISO
  readonly streamUrl?: string | null;
  readonly location?: string;
}): Promise<Result<{ readonly id: string }>> {
  const title = (input.title ?? '').trim();
  if (title.length === 0) return { ok: false, error: 'title is required' };
  if (title.length > EVENT_TITLE_MAX)
    return { ok: false, error: `title over ${EVENT_TITLE_MAX} chars` };
  const description = (input.description ?? '').trim().slice(0, EVENT_DESC_MAX) || null;

  const startsAtMs = Date.parse(input.startsAt);
  const endsAtMs = Date.parse(input.endsAt);
  if (!Number.isFinite(startsAtMs)) return { ok: false, error: 'invalid start time' };
  if (!Number.isFinite(endsAtMs)) return { ok: false, error: 'invalid end time' };
  if (endsAtMs <= startsAtMs) return { ok: false, error: 'end must be after start' };

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('realm_id, role')
    .eq('member_id', user.id)
    .maybeSingle();
  if (!membership?.realm_id) return { ok: false, error: 'no realm membership' };
  if (membership.role !== 'creator' && membership.role !== 'admin') {
    return { ok: false, error: 'only creators can schedule events' };
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      realm_id: membership.realm_id,
      creator_id: user.id,
      title,
      description,
      starts_at: new Date(startsAtMs).toISOString(),
      ends_at: new Date(endsAtMs).toISOString(),
      stream_url: input.streamUrl ?? null,
      location: input.location ?? 'tavern-a',
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  // Auto-post an announcement row so members see the event in the
  // async feed the moment it's scheduled.
  await supabase.from('posts').insert({
    realm_id: membership.realm_id,
    author_id: user.id,
    kind: 'event-created',
    body: `Scheduled · ${title}`,
    metadata: { event_id: data.id },
  });

  revalidatePath('/dashboard/events');
  revalidatePath('/tavern');
  revalidatePath('/dashboard');
  return { ok: true, value: { id: data.id } };
}

export async function updateEvent(input: {
  readonly id: string;
  readonly title?: string;
  readonly description?: string | null;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly streamUrl?: string | null;
  readonly location?: string;
}): Promise<Result<{ readonly id: string }>> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not signed in' };

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const t = input.title.trim();
    if (t.length === 0) return { ok: false, error: 'title is required' };
    if (t.length > EVENT_TITLE_MAX) return { ok: false, error: 'title too long' };
    patch.title = t;
  }
  if (input.description !== undefined) {
    patch.description = (input.description ?? '').trim().slice(0, EVENT_DESC_MAX) || null;
  }
  if (input.startsAt !== undefined) {
    const ms = Date.parse(input.startsAt);
    if (!Number.isFinite(ms)) return { ok: false, error: 'invalid start time' };
    patch.starts_at = new Date(ms).toISOString();
  }
  if (input.endsAt !== undefined) {
    const ms = Date.parse(input.endsAt);
    if (!Number.isFinite(ms)) return { ok: false, error: 'invalid end time' };
    patch.ends_at = new Date(ms).toISOString();
  }
  if (input.streamUrl !== undefined) patch.stream_url = input.streamUrl;
  if (input.location !== undefined) patch.location = input.location;

  const { error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', input.id)
    .eq('creator_id', user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/events');
  revalidatePath('/tavern');
  return { ok: true, value: { id: input.id } };
}

export async function deleteEvent(id: string): Promise<Result<{ readonly id: string }>> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not signed in' };

  const { error } = await supabase.from('events').delete().eq('id', id).eq('creator_id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/events');
  revalidatePath('/tavern');
  return { ok: true, value: { id } };
}
