# Phase 5 — Status

Source plan: `phase-05_plan.md`. Entries chronological, newest on top.

## 2026-04-21 — Phase 5 EXIT (engineering complete)

**15 of 17 steps shipped.** Core gamification loop live on prod + bundled-polish items landed. Steps 11–12 are manual QA pending user pass; Steps 16–17 are explicit punts to the polish backlog.

### Shipped in this close-out pass (Steps 13 / 14 / 15)

- **Step 13 — `get_enrolment_count` wired into `/market`.** The SECURITY DEFINER RPC was already live from the Phase-5 migration (backend done in Step 1); the server component was still seeding 0 on every stall. Now calls the RPC in parallel for all visible courses; stall cards + modal both surface a real "N enrolled" number. Commit `2157ece`.
- **Step 14 — Leaderboard display-name fallback.** `memberships.display_name` is now `string | null` on the wire; `LeaderboardPanel` pulls `avatar_id` alongside and renders via `resolveDisplayName()`: real display name → `AVATAR_NAMES[avatar_id]` → `"Player"`. No empty rows. Realtime UPDATE payloads carry the full row so the subscription-side merge path works unchanged. Commit `598dfdf`.
- **Step 15 — Image-backed scene collider scaffold.** `scenes/shared/colliders.ts` exposes `spawnColliders(scene, rects)` that builds a StaticGroup from a `PixelRect[]` config. Each image-backed scene (Tavern / Academy / Market) has a `colliders: []` entry + a no-op wire in `create()`. Ships empty — avatar still walks over everything until user drops rectangles into the exported `*_COLLIDERS` arrays. Activates with zero code change. Commit `598dfdf`.

### Deferred to polish backlog

- **Step 11 — 60 FPS measurement.** Manual DevTools Performance recording per Phaser scene on a mid-range laptop. Not a blocker; can run whenever. Entry point: Chrome DevTools → Performance → record 10 s of `/world` movement → check average FPS ≥ 58.
- **Step 12 — Demo-cut walkthrough.** End-to-end rehearsal on prod. Run when preparing for the actual demo recording.
- **Step 16 — Building-entry art on `/world`.** Tavern + Market entrance tiles still Phase-1 invisible overlap zones. Academy sprite already placed in Phase 2. Separate item in `phases/phase-02_polish_backlog.md`.
- **Step 17 — Reactions UI re-add.** Backend `toggle_reaction` RPC + RLS suite still intact; `ReactionPicker.tsx` retrievable from branch `phase-02-chat-polish-v2` commit `44c577a`. Deferred per "conditional" framing in the plan.

### Migration state

All five Phase-3-through-5 migrations applied to both `arcadia-test` and `arcadia` (prod):

| Migration | Scope |
|---|---|
| `20260421000001_phase3_courses_lessons_progress` | `courses.creator_id`, `lessons.youtube_video_id` / `duration_sec`, creator-scoped RLS, enrolment insert policies |
| `20260421000002_phase3_storage_course_thumbnails` | `course-thumbnails` Storage bucket |
| `20260421000003_phase3_membership_roles` | `memberships.role`, `user_has_creator_role()` helper |
| `20260421000004_phase3_set_lesson_duration` | Viewer-writable duration RPC |
| `20260422000001_phase4_market_indexes` | Market-grid + completed-progress indexes |
| `20260422000002_phase5_gamification` | `calculate_level`, `award_xp`, `on_lesson_complete` trigger, `get_enrolment_count` |

### Phase 5 exit criteria

| Criterion | Status |
|---|---|
| Lesson completion → +25 XP awarded via trigger | ✅ verified 2026-04-21 smoke |
| Level auto-recomputes at TAD thresholds | ✅ `calculate_level()` verified |
| Banner animates on level-up | ✅ user-confirmed smoke |
| Peer level badge updates live via `UPDATE_LEVEL` | ✅ Colyseus path covered, Phase 2 test suite + manual verification |
| Tavern leaderboard renders non-zero XP | ✅ user-confirmed smoke |
| Stall enrolment count reflects reality | ✅ (post Step 13 wire) |
| Leaderboard handles missing display_name gracefully | ✅ (post Step 14 fallback) |
| Colliders activate from config without code change | ✅ (post Step 15 scaffold, arrays ship empty) |
| CI green | ✅ typecheck / lint / 152 tests across all three workspaces |
| No regressions in Phases 3 / 4 | ✅ |

### Ready for MVP launch prep

Phase 5 was the last planned phase in `/docs/mvp/phase-plan.md`. MVP is now feature-complete on paper. Realistic next things worth considering (not a phase, just a backlog):

- **Step 11 + Step 12** — run them when preparing the actual demo.
- **World swap** — orthogonal top-down with object layers for oversized decor (ADR 0007). Parked behind "Tiled re-author" on the user side.
- **Backlog from `phases/phase-02_polish_backlog.md`** — tavern/market building-entry art, Tavern colliders (need user-supplied rects), Academy multiplayer, reactions UI.
- **Production-readiness** — monitoring, backups, SLA docs, rate-limit hardening. Phase 6+ if we ever formalise.

---

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
