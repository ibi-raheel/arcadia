import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  loadTestEnvOrSkip,
  runId,
  userAnonClient,
  type TestUser,
} from './helpers';

// Phase 0 Step 17. Verifies the RLS policies from TAD §6.2 + the migrations
// applied in Step 7 actually prevent cross-member and cross-realm data leakage.
// Runs against the arcadia-test Supabase project — production project refs are
// blacklisted in helpers.ts.

const env = loadTestEnvOrSkip();

(env ? describe : describe.skip)('RLS — cross-member and cross-realm leakage (TAD §6.2)', () => {
  const suffix = runId();
  const testPassword = `leakage-test-pw-${suffix}`;

  let admin: SupabaseClient;
  let mvpRealmId: string;
  let realmBId: string;
  let userA: TestUser; // mvp-realm
  let userB: TestUser; // mvp-realm
  let userC: TestUser; // realm B

  // seed ids for cleanup + assertions
  let courseAId: string;
  let courseBId: string;
  let sectionAId: string;
  let sectionBId: string;
  let lessonAId: string;
  let lessonBId: string;

  beforeAll(async () => {
    admin = adminClient(env!);

    // mvp-realm is seeded by migration 20260418000001; find its id.
    const mvp = await admin.from('realms').select('id').eq('slug', 'mvp-realm').single();
    if (mvp.error || !mvp.data) throw new Error(`mvp-realm not found: ${mvp.error?.message}`);
    mvpRealmId = mvp.data.id;

    // Create throwaway Realm B for the cross-realm portion of the suite.
    const insertedB = await admin
      .from('realms')
      .insert({
        slug: `test-realm-b-${suffix}`,
        name: 'Realm B (leakage test)',
        theme: 'test',
      })
      .select('id')
      .single();
    if (insertedB.error || !insertedB.data)
      throw new Error(`create realm B failed: ${insertedB.error?.message}`);
    realmBId = insertedB.data.id;

    // Three users. Signup trigger puts them all in mvp-realm; move C to realm B.
    userA = await createTestUser(admin, `leakage-a-${suffix}@arcadia.test`, testPassword);
    userB = await createTestUser(admin, `leakage-b-${suffix}@arcadia.test`, testPassword);
    userC = await createTestUser(admin, `leakage-c-${suffix}@arcadia.test`, testPassword);

    const moveC = await admin
      .from('memberships')
      .update({ realm_id: realmBId })
      .eq('member_id', userC.id);
    if (moveC.error) throw new Error(`move userC to realm B failed: ${moveC.error.message}`);

    // Seed one course/section/lesson per realm so there's content to test leakage against.
    const courseA = await admin
      .from('courses')
      .insert({
        realm_id: mvpRealmId,
        title: `Course A ${suffix}`,
        description: 'leakage test course',
        published: true,
      })
      .select('id')
      .single();
    if (courseA.error || !courseA.data)
      throw new Error(`create courseA: ${courseA.error?.message}`);
    courseAId = courseA.data.id;

    const courseB = await admin
      .from('courses')
      .insert({
        realm_id: realmBId,
        title: `Course B ${suffix}`,
        description: 'leakage test course (realm B)',
        published: true,
      })
      .select('id')
      .single();
    if (courseB.error || !courseB.data)
      throw new Error(`create courseB: ${courseB.error?.message}`);
    courseBId = courseB.data.id;

    const sectionA = await admin
      .from('sections')
      .insert({ course_id: courseAId, title: 'Section A', sort_order: 0 })
      .select('id')
      .single();
    sectionAId = sectionA.data!.id;

    const sectionB = await admin
      .from('sections')
      .insert({ course_id: courseBId, title: 'Section B', sort_order: 0 })
      .select('id')
      .single();
    sectionBId = sectionB.data!.id;

    const lessonA = await admin
      .from('lessons')
      .insert({
        course_id: courseAId,
        section_id: sectionAId,
        title: 'Lesson A',
        type: 'written',
        content: 'hello',
        sort_order: 0,
        is_preview: false,
      })
      .select('id')
      .single();
    lessonAId = lessonA.data!.id;

    const lessonB = await admin
      .from('lessons')
      .insert({
        course_id: courseBId,
        section_id: sectionBId,
        title: 'Lesson B',
        type: 'written',
        content: 'world',
        sort_order: 0,
        is_preview: false,
      })
      .select('id')
      .single();
    lessonBId = lessonB.data!.id;

    // Enrolments: A + B enrolled in courseA (mvp-realm); C enrolled in courseB (realm B).
    await admin.from('enrolments').insert([
      { realm_id: mvpRealmId, course_id: courseAId, member_id: userA.id },
      { realm_id: mvpRealmId, course_id: courseAId, member_id: userB.id },
      { realm_id: realmBId, course_id: courseBId, member_id: userC.id },
    ]);

    // lesson_progress: one row per user for their own lesson.
    await admin.from('lesson_progress').insert([
      { lesson_id: lessonAId, member_id: userA.id, completed: true, watched_secs: 42 },
      { lesson_id: lessonAId, member_id: userB.id, completed: false, watched_secs: 10 },
      { lesson_id: lessonBId, member_id: userC.id, completed: false, watched_secs: 0 },
    ]);
  });

  afterAll(async () => {
    // Delete in reverse-dependency order. ON DELETE CASCADE handles most of
    // this, but be explicit about user + realm removal so we don't leak
    // auth.users rows between runs.
    if (admin) {
      if (userA) await deleteTestUser(admin, userA.id);
      if (userB) await deleteTestUser(admin, userB.id);
      if (userC) await deleteTestUser(admin, userC.id);
      if (realmBId) await admin.from('realms').delete().eq('id', realmBId);
    }
  });

  describe('same-realm same-table leakage (users A and B in mvp-realm)', () => {
    it('userA cannot SELECT userB lesson_progress', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client
        .from('lesson_progress')
        .select('id, member_id')
        .eq('member_id', userB.id);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it("userA's lesson_progress SELECT * returns only userA's rows", async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client.from('lesson_progress').select('member_id');
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(1);
      expect(data![0]!.member_id).toBe(userA.id);
    });

    it('userA cannot SELECT userB enrolments', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client
        .from('enrolments')
        .select('id, member_id')
        .eq('member_id', userB.id);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it('userA cannot INSERT lesson_progress with userB as member_id (spoof)', async () => {
      const client = await userAnonClient(env!, userA);
      const { error } = await client.from('lesson_progress').insert({
        lesson_id: lessonAId,
        member_id: userB.id,
        completed: true,
        watched_secs: 9999,
      });
      expect(error).not.toBeNull();
      expect(error!.message.toLowerCase()).toMatch(/row-level security|violates|policy/);
    });

    it('userA cannot UPDATE userB lesson_progress', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client
        .from('lesson_progress')
        .update({ completed: true, watched_secs: 9999 })
        .eq('member_id', userB.id)
        .select();
      // RLS silently filters: update either errors OR returns zero rows affected.
      expect(error == null && (data ?? []).length === 0).toBe(true);
    });
  });

  describe('cross-realm leakage (userA in mvp-realm vs realm B)', () => {
    it('userA cannot SELECT realm B memberships', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client
        .from('memberships')
        .select('member_id')
        .eq('realm_id', realmBId);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it('userA cannot SELECT realm B courses', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client.from('courses').select('id').eq('realm_id', realmBId);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it('userA cannot SELECT realm B realms row', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client.from('realms').select('id').eq('id', realmBId);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it('userA cannot SELECT userC lesson_progress (different realm)', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client
        .from('lesson_progress')
        .select('id')
        .eq('member_id', userC.id);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });
  });

  describe('reverse direction (userC in realm B vs mvp-realm)', () => {
    it('userC cannot SELECT mvp-realm courses', async () => {
      const client = await userAnonClient(env!, userC);
      const { data, error } = await client.from('courses').select('id').eq('realm_id', mvpRealmId);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it('userC cannot SELECT mvp-realm memberships', async () => {
      const client = await userAnonClient(env!, userC);
      const { data, error } = await client
        .from('memberships')
        .select('member_id')
        .eq('realm_id', mvpRealmId);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });
  });

  describe('tavern_messages — Week 8 reaction RPC + direct-update revoke', () => {
    let messageAId: string; // posted in mvp-realm
    let messageBId: string; // posted in realm B

    beforeAll(async () => {
      // Seed one message per realm via the service-role admin.
      const mvpMsg = await admin
        .from('tavern_messages')
        .insert({ realm_id: mvpRealmId, sender_id: userA.id, content: `msg A ${suffix}` })
        .select('id')
        .single();
      if (mvpMsg.error || !mvpMsg.data)
        throw new Error(`seed mvp message: ${mvpMsg.error?.message}`);
      messageAId = mvpMsg.data.id;

      const rbMsg = await admin
        .from('tavern_messages')
        .insert({ realm_id: realmBId, sender_id: userC.id, content: `msg B ${suffix}` })
        .select('id')
        .single();
      if (rbMsg.error || !rbMsg.data)
        throw new Error(`seed realmB message: ${rbMsg.error?.message}`);
      messageBId = rbMsg.data.id;
    });

    it('direct UPDATE on tavern_messages is blocked for authenticated role', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client
        .from('tavern_messages')
        .update({ content: 'HACKED' })
        .eq('id', messageAId)
        .select();
      // After the Phase 2 Week 8 revoke + policy drop, authenticated has no
      // path to UPDATE. Postgres either errors (permission denied) or RLS
      // filters to zero rows.
      expect(error != null || (data ?? []).length === 0).toBe(true);
    });

    it('toggle_reaction adds the caller to the emoji list, then removes on second call', async () => {
      const client = await userAnonClient(env!, userA);

      const addResult = await client.rpc('toggle_reaction', {
        p_message_id: messageAId,
        p_emoji: '🔥',
      });
      expect(addResult.error).toBeNull();
      expect((addResult.data as Record<string, string[]>)['🔥']).toContain(userA.id);

      const removeResult = await client.rpc('toggle_reaction', {
        p_message_id: messageAId,
        p_emoji: '🔥',
      });
      expect(removeResult.error).toBeNull();
      // Empty emoji key should be pruned so count rendering stays clean.
      expect((removeResult.data as Record<string, string[]>)['🔥']).toBeUndefined();
    });

    it('toggle_reaction rejects callers from a different realm (userA → realm B message)', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client.rpc('toggle_reaction', {
        p_message_id: messageBId,
        p_emoji: '🔥',
      });
      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error!.message.toLowerCase()).toMatch(/not a member/);
    });

    it('toggle_reaction leaves content and sender_id untouched', async () => {
      const client = await userAnonClient(env!, userA);
      await client.rpc('toggle_reaction', { p_message_id: messageAId, p_emoji: '💯' });

      // Verify via admin (bypasses RLS) that ONLY reactions changed.
      const { data: row } = await admin
        .from('tavern_messages')
        .select('content, sender_id, reactions')
        .eq('id', messageAId)
        .single();
      expect(row!.content).toBe(`msg A ${suffix}`);
      expect(row!.sender_id).toBe(userA.id);
      expect((row!.reactions as Record<string, string[]>)['💯']).toContain(userA.id);
    });

    it('toggle_reaction rejects empty or whitespace-only emoji', async () => {
      const client = await userAnonClient(env!, userA);
      const empty = await client.rpc('toggle_reaction', {
        p_message_id: messageAId,
        p_emoji: '   ',
      });
      expect(empty.error).not.toBeNull();
      expect(empty.error!.message.toLowerCase()).toMatch(/empty emoji/);
    });
  });

  describe('same-realm legitimate access still works', () => {
    it('userA CAN SELECT userB membership (same-realm, leaderboard path)', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client
        .from('memberships')
        .select('member_id')
        .eq('member_id', userB.id)
        .eq('realm_id', mvpRealmId);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(1);
    });

    it('userA CAN SELECT own lesson_progress', async () => {
      const client = await userAnonClient(env!, userA);
      const { data, error } = await client
        .from('lesson_progress')
        .select('member_id, completed')
        .eq('member_id', userA.id);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(1);
      expect(data![0]!.completed).toBe(true);
    });
  });
});
