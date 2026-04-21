# Phase 5 — Status

Source plan: `phase-05_plan.md`. Entries chronological, newest on top.

## 2026-04-21 — Gamification core live on prod (Steps 1–10)

**Lesson completion → XP → level-up → peer level badge loop working end-to-end on `arcadia-web-swart.vercel.app`.** Migration landed on arcadia-test first (per decision), smoked locally, then promoted to prod. User ran the full creator → member → level-up smoke on prod and confirmed:

- Banner fired on lesson completion.
- Tavern leaderboard now renders non-zero XP.
- Peer level badges update without a reload when another member levels up (Colyseus `UPDATE_LEVEL` path).

### What shipped

| Step | Landed |
|---|---|
| 1 | Migration `20260422000002_phase5_gamification.sql` applied to arcadia-test on 2026-04-21, prod on 2026-04-21. Four gamification entities: `calculate_level`, `award_xp`, `on_lesson_complete`, `trg_lesson_complete` + bundled polish `get_enrolment_count` RPC. |
| 2 | Pure client helper `packages/shared/src/gamification/levels.ts` already shipped in Phase 0; 22 boundary tests passing. No work needed. |
| 3 | SQL smoke against arcadia-test via `DO $seed$ ... $seed$` block: lesson_progress INSERT fired trigger, xp went 0 → 25, re-fire idempotent (Supabase editor choked on bare `$$`, used tagged dollar-quotes + hardcoded UUIDs to work around its parser). |
| 4 | `use-level-sync.ts` — browser subscribes to `postgres_changes` on caller's `memberships` row; on level increase fires `eventBus.emit('level-up')` + sends `MSG.UPDATE_LEVEL` to any connected Colyseus room. |
| 5 | `event-bus.ts` — typed singleton wrapping an `EventTarget`. One event today (`level-up`); extensible. |
| 6 | `LevelUpBanner.tsx` — React portal; gold gradient overlay with a 2 s keyframe animation. Scene-agnostic (works in World / Tavern / Academy / Market). |
| 7 | Wired `useLevelSync` + `<LevelUpBanner />` into all four Game* mounts. World + Tavern pass the live Colyseus connection via new `colyseusConn` state setter so the async room-join doesn't miss the hook. |
| 8 | Game-server `applyUpdateLevel` verified green from Phase-2 coverage (11 cases in `realm-handlers.test.ts`). No work needed. |
| 9 | 2 new RLS integration tests in `rls-cross-member-leakage.test.ts`: userA upsert → +25 XP isolated to userA only; re-upsert of already-completed row doesn't double-fire. Env-gated, skipped locally. |
| 10 | Smoke on prod 2026-04-21 — banner + peer badge + leaderboard all green. |

### Known issue during Step 3

Supabase's SQL editor rejects `do $$ ... $$` blocks when combined with other statements (linter false-positive on variable DECLARE). Worked around with tagged dollar-quotes (`do $seed$ ... $seed$`) and hardcoded UUIDs for follow-up statements. Noted here in case it bites again.

### Pending (Phase 5 steps 11–17)

**Gamification loop is shipped and verified — these are polish / measurement items that don't block the demo path:**

- **Step 11 — 60 FPS measurement.** DevTools Performance run against each of the four Phaser scenes on a mid-range laptop; record median + p95 frame times. Blocker only if we dip below 58 FPS sustained.
- **Step 12 — Demo-cut checklist.** End-to-end walkthrough on prod, note rough edges, fix blocking ones only.
- **Step 13 — Bundled polish: stall enrolment-count RPC.** `get_enrolment_count` ships in the migration but isn't wired to the `/market` page's stall data yet. Server component needs to call it per-course and stop passing zeros.
- **Step 14 — Bundled polish: leaderboard display-name fallback.** `memberships.display_name` may be null → render as "Player" or avatar canonical name instead of empty row.
- **Step 15 — Bundled polish: collider scaffold.** `colliders: PixelRect[]` config entries + `spawnColliders` helper for Tavern / Academy / Market. Ship empty arrays; user fills in per scene.
- **Step 16 — Building-entry art triage.** Tavern + Market entrance tiles on `/world` still Phase-1 invisible placeholders.
- **Step 17 — Reactions UI re-add** (conditional — only if time allows in the polish window).

Full Phase 5 exit gated on 11 + 13 + 14 + 15. 16 + 17 are nice-to-haves.
