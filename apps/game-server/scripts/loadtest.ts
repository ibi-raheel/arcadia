// MOVE-loop load test for Phase 2 Week 7. Seeds N test users, signs each
// in, connects N Colyseus clients to `world-realm1`, has each send MOVE at
// 20 Hz on a circular path for the configured duration, and measures
// state-patch propagation latency on an observer client.
//
// Exit 1 if p95 latency > LOADTEST_P95_TARGET_MS (default 100 ms).
//
// **Do not run against prod Supabase.** The script bails if
// TEST_SUPABASE_URL points at the production ref (hard guard, same idea
// as the RLS suite). Use the arcadia-test project provisioned in Phase 0.
//
// Env:
//   TEST_SUPABASE_URL            — Supabase project URL for test users
//   TEST_SUPABASE_SERVICE_KEY    — service-role key for that project
//   LOADTEST_COLYSEUS_URL        — defaults to ws://localhost:2567
//   LOADTEST_USER_COUNT          — defaults to 20
//   LOADTEST_DURATION_SEC        — defaults to 60
//   LOADTEST_P95_TARGET_MS       — defaults to 100
//
// Teardown: `npm run loadtest:teardown` removes the seeded test users.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Colyseus from 'colyseus.js';

import { MSG, type AvatarDirection } from '@arcadia/shared';

const PROD_SUPABASE_REF = 'eqbzltiasmuckgsapkye'; // matches apps/web/tests/rls guard
const LOAD_USER_PREFIX = 'load-';
const LOAD_USER_DOMAIN = '@arcadia.test';
const LOAD_USER_PASSWORD = 'loadtest-phase-2-week-7!';

type EnvConfig = {
  supabaseUrl: string;
  serviceKey: string;
  colyseusUrl: string;
  userCount: number;
  durationMs: number;
  p95TargetMs: number;
};

function parseEnv(): EnvConfig {
  const supabaseUrl = requireEnv('TEST_SUPABASE_URL');
  const serviceKey = requireEnv('TEST_SUPABASE_SERVICE_KEY');
  if (supabaseUrl.includes(PROD_SUPABASE_REF)) {
    console.error(
      `refusing to run — TEST_SUPABASE_URL points at production ref ${PROD_SUPABASE_REF}`,
    );
    process.exit(2);
  }
  return {
    supabaseUrl,
    serviceKey,
    colyseusUrl: process.env.LOADTEST_COLYSEUS_URL ?? 'ws://localhost:2567',
    userCount: Number(process.env.LOADTEST_USER_COUNT ?? 20),
    durationMs: Number(process.env.LOADTEST_DURATION_SEC ?? 60) * 1000,
    p95TargetMs: Number(process.env.LOADTEST_P95_TARGET_MS ?? 100),
  };
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`missing env ${key}`);
    process.exit(2);
  }
  return value;
}

function userEmail(index: number): string {
  return `${LOAD_USER_PREFIX}${String(index + 1).padStart(2, '0')}${LOAD_USER_DOMAIN}`;
}

/**
 * Ensures a test user exists and has avatar_id populated. Returns its
 * access token. Idempotent: if the user already exists we just sign in.
 */
async function seedAndLogin(admin: SupabaseClient, index: number): Promise<string> {
  const email = userEmail(index);
  // createUser fails cleanly with a "already exists" message when we
  // re-run — swallow that specific failure.
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password: LOAD_USER_PASSWORD,
    email_confirm: true,
  });
  if (createErr && !/already.*register|exists/i.test(createErr.message)) {
    throw new Error(`createUser ${email} failed: ${createErr.message}`);
  }

  // Populate avatar_id so onAuth doesn't reject. Cycle through avatar-01..08.
  const avatarId = `avatar-${String((index % 8) + 1).padStart(2, '0')}`;
  const { error: updateErr } = await admin
    .from('memberships')
    .update({ avatar_id: avatarId, display_name: `Load ${index + 1}` })
    .eq('member_id', await userIdFor(admin, email));
  if (updateErr) {
    throw new Error(`memberships.update ${email}: ${updateErr.message}`);
  }

  // Sign in with a fresh anon client to get a session token.
  const anon = createClient(parseEnv().supabaseUrl, parseEnv().serviceKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password: LOAD_USER_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`signIn ${email}: ${error?.message ?? 'no session'}`);
  }
  return data.session.access_token;
}

async function userIdFor(admin: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  const match = data.users.find((u) => u.email === email);
  if (!match) throw new Error(`user not found after createUser: ${email}`);
  return match.id;
}

type ClientHandle = {
  index: number;
  room: Colyseus.Room;
  observer: boolean;
  pending: Map<number, number>; // seq → sendAt (observer only)
  latencies: number[];
};

async function connectClient(
  cfg: EnvConfig,
  accessToken: string,
  index: number,
  observer: boolean,
): Promise<ClientHandle> {
  const client = new Colyseus.Client(cfg.colyseusUrl);
  const room = await client.joinOrCreate('world-realm1', { accessToken });
  return { index, room, observer, pending: new Map(), latencies: [] };
}

const DIRECTIONS: AvatarDirection[] = ['n', 'e', 's', 'w'];

function circularPathPoint(
  tSec: number,
  index: number,
): { x: number; y: number; direction: AvatarDirection } {
  // Each client walks a small circle offset by its index so clients don't
  // overlap and trigger spurious dedupe.
  const radius = 80 + (index % 4) * 20;
  const angularSpeed = (2 * Math.PI) / 4; // 4s per revolution
  const phase = (index / 20) * 2 * Math.PI;
  const angle = tSec * angularSpeed + phase;
  const x = Math.cos(angle) * radius + 480;
  const y = Math.sin(angle) * radius + 320;
  const dirIndex = Math.floor(((angle / (Math.PI / 2)) % 4) + 4) % 4;
  return { x, y, direction: DIRECTIONS[dirIndex]! };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? NaN;
}

async function main(): Promise<void> {
  const cfg = parseEnv();
  console.log(
    `[loadtest] url=${cfg.colyseusUrl} users=${cfg.userCount} duration=${cfg.durationMs / 1000}s`,
  );

  const admin = createClient(cfg.supabaseUrl, cfg.serviceKey, {
    auth: { persistSession: false },
  });

  // Seed + login — serialise a bit to avoid Supabase rate-limit bursts.
  const tokens: string[] = [];
  for (let i = 0; i < cfg.userCount; i++) {
    const token = await seedAndLogin(admin, i);
    tokens.push(token);
    process.stdout.write('.');
  }
  console.log(`\n[loadtest] ${tokens.length} users ready`);

  // Connect all clients in parallel.
  const handles: ClientHandle[] = await Promise.all(
    tokens.map((t, i) => connectClient(cfg, t, i, i === 0)),
  );
  console.log(`[loadtest] ${handles.length} connected`);

  const observer = handles[0]!;
  // Observer subscribes to state patches — when the peer-1 avatar's x
  // arrives matching the peer-1-sent x, compute the delta from that send.
  observer.room.onStateChange(() => {
    const now = Date.now();
    const peer1 = observer.room.state.avatars.get(handles[1]!.room.sessionId);
    if (!peer1) return;
    // Decode the seq stashed in x's fractional part (see MOVE payload below).
    const decoded = Math.round((peer1.x * 1000) % 1000);
    const sendAt = observer.pending.get(decoded);
    if (sendAt !== undefined) {
      observer.latencies.push(now - sendAt);
      observer.pending.delete(decoded);
    }
  });

  // Peer 1 encodes a monotonically-increasing seq number into the
  // fractional component of x so the observer can match send ↔ patch.
  let seq = 0;
  const start = Date.now();
  const interval = setInterval(() => {
    const tSec = (Date.now() - start) / 1000;
    for (let i = 0; i < handles.length; i++) {
      const h = handles[i]!;
      const p = circularPathPoint(tSec, i);
      let { x } = p;
      if (i === 1) {
        seq = (seq + 1) % 1000;
        x = Math.floor(x) + seq / 1000;
        observer.pending.set(seq, Date.now());
      }
      h.room.send(MSG.MOVE, {
        x,
        y: p.y,
        direction: p.direction,
        isMoving: true,
      });
    }
  }, 50);

  await new Promise((r) => setTimeout(r, cfg.durationMs));
  clearInterval(interval);

  // Short tail so final patches land before we teardown.
  await new Promise((r) => setTimeout(r, 500));
  await Promise.all(handles.map((h) => h.room.leave(true).catch(() => undefined)));

  const ls = observer.latencies;
  console.log(`[loadtest] samples=${ls.length}`);
  if (ls.length === 0) {
    console.error('[loadtest] no latency samples collected — observer never saw peer patches');
    process.exit(1);
  }
  const p50 = percentile(ls, 50);
  const p95 = percentile(ls, 95);
  const p99 = percentile(ls, 99);
  const max = Math.max(...ls);
  console.log(`[loadtest] latency ms — p50=${p50} p95=${p95} p99=${p99} max=${max}`);

  if (p95 > cfg.p95TargetMs) {
    console.error(`[loadtest] FAIL p95 ${p95} > target ${cfg.p95TargetMs}`);
    process.exit(1);
  }
  console.log(`[loadtest] PASS p95 ${p95} <= target ${cfg.p95TargetMs}`);
}

main().catch((err) => {
  console.error('[loadtest] crashed:', err);
  process.exit(1);
});
