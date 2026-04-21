# 2026-04-21 — Phase 5 gamification core live

Lesson completion now drives XP, XP drives level, level drives the level-up banner, and peers in the same Colyseus room see each other's badges update in real time. Tavern leaderboard stopped rendering zeroes.

## What shipped

### Server side

- **Migration `20260422000002_phase5_gamification.sql`** — applied to arcadia-test (2026-04-21) and prod (2026-04-21).
  - `calculate_level(total_xp int)` — shared 1/2/3/4/5 thresholds at 0/100/300/600/1000 XP (TAD §8.1).
  - `award_xp(member_id, realm_id, amount)` — SECURITY DEFINER mutator. All future XP sources call this.
  - `on_lesson_complete()` + `trg_lesson_complete` — AFTER INSERT OR UPDATE on `lesson_progress`; fires +25 XP on the `completed = false → true` transition only. Guard is `coalesce(old.completed, false) = false` so both INSERT-with-completed-true and UPDATE-flipping-to-true count, but re-UPDATE-on-completed-true doesn't double-fire.
  - `get_enrolment_count(course_id)` — bundled polish RPC. SECURITY DEFINER, returns 0 for unpublished / cross-realm lookups rather than leaking existence. Ready for `/market` stall cards; wiring-to-page pending in Step 13.

### Client side

- **`packages/shared/src/gamification/levels.ts`** — already shipped in Phase 0. 22 boundary tests passing.
- **`components/game/net/event-bus.ts`** — tiny typed EventTarget singleton. `level-up` event today.
- **`components/game/net/use-level-sync.ts`** — per-scene hook. Subscribes to `postgres_changes` on the caller's `memberships` row, filters to self via `filter: member_id=eq.<uid>`. On level increase → `eventBus.emit('level-up', newLevel)` + (if a Colyseus connection is attached) `room.send(MSG.UPDATE_LEVEL, { level })`.
- **`components/game/LevelUpBanner.tsx`** — React portal; gold gradient overlay animating over the Phaser canvas for 2 s. Scene-agnostic.
- **Wired into all four Game mounts**: `GameWorld`, `GameTavern`, `GameAcademy`, `GameMarket`. World + Tavern now keep their Colyseus connection in `useState` (not just a ref) so `useLevelSync` re-renders with the latest reference once the async room join completes.

### Tests

- **2 new Phase-5 RLS cases** in `rls-cross-member-leakage.test.ts`: userA flipping their own lesson_progress awards +25 XP to userA only (userB unchanged); re-upsert doesn't double-fire. Env-gated, run when `TEST_SUPABASE_*` is set.
- **Game-server `applyUpdateLevel`** already fully covered from Phase 2 (11 cases in `realm-handlers.test.ts`). No new work.

## Post-migration smoke (prod)

All four verify queries green. User-run end-to-end smoke on `arcadia-web-swart.vercel.app`:

- Creator marks a lesson complete → trigger fires → memberships.xp ↑ by 25.
- Realtime propagates level delta within ~500 ms → banner pops for 2 s.
- Peer in same Colyseus room sees updated level badge without a reload.
- Tavern leaderboard panel renders correct non-zero values.

## Known-quirks captured

- **Supabase SQL editor chokes on bare `$$` DO blocks** when combined with other statements in the same paste. Workaround: tagged dollar-quotes (`$seed$ ... $seed$`) + hardcoded UUIDs for cross-statement references. Noted in `phases/phase-05_status.md`.

## Polish items still pending (Phase 5 full exit)

- **Step 11** — 60 FPS measurement pass on real art across all four Phaser scenes.
- **Step 12** — Demo-cut checklist.
- **Step 13** — Wire `get_enrolment_count` into `/market` server fetch so stall cards show a real "N enrolled" number instead of 0.
- **Step 14** — Leaderboard display-name fallback chain.
- **Step 15** — Collider scaffold for Tavern / Academy / Market.
- **Step 16** — Building-entry art triage on `/world`.
- **Step 17** — Reactions UI re-add (conditional).

## Commit map

- `c06970a` — migration file
- `6c1a2a5` — hook + event bus + banner + 4 mount wires
- `53aa962` — RLS test extension
