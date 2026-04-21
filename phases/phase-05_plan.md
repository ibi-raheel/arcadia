## Phase 5 Plan: Gamification + Demo Polish

**Source:** `/docs/mvp/phase-plan.md` §Phase 5 (Week 12), `/docs/mvp/tad.md` §8 (gamification: level calculation, XP sources, Supabase→Colyseus sync), §5.3 (`UPDATE_LEVEL` message), `/docs/mvp/prd.md` §Gamification. This plan is executable; MVP docs are the contract.

**Goal:** Lesson completion awards XP via a DB trigger. The member's level recomputes on every XP delta using `calculate_level()`. The owning client's browser watches its `memberships` row via Supabase Realtime; on a level change it sends `UPDATE_LEVEL` to whichever Colyseus room it's in (`world-realm1` / `tavern-realm1`) and fires a local **level-up banner** animation. `AvatarState.level` propagates the new level to peers in the same room so their badge visibly ticks up in real time. The Tavern leaderboard stops rendering 0 XP — it shows the live ordered top-10 members by `xp DESC`. Finally, a one-hour polish pass: 60 FPS measurement on a mid-range laptop against the real-art scenes; demo-cut checklist.

Out of scope: tavern-message XP (TAD §8.2 has +5 per message with a rate-limit trigger — punt to post-MVP to avoid complicating the demo with noise). Daily-login XP (+10) — same reason. Course-completion XP (+100) — keep the lesson-completion trigger only; course-completion is an Edge Function in TAD §8.2, and the demo doesn't need it. Tavern message rate-limit is a Phase 6+ concern.

---

### Pre-plan decisions — NEEDS USER CONFIRMATION

| # | Decision | Recommendation | Why |
|---|---|---|---|
| A | **Which XP source fires in Phase 5** | **Lesson completion only** (+25 XP per lesson via DB trigger on `lesson_progress`). Defer daily-login, course-completion, and tavern-message sources to post-MVP. | TAD lists four sources but the demo only needs one to show the loop working. Adding three more multiplies testing surface + Edge Function footprint without strengthening the demo. |
| B | **Trigger placement** | DB trigger `trg_lesson_complete` on `lesson_progress` INSERT/UPDATE, firing on the `completed=false → true` transition. Exact SQL from TAD §8.2. Wraps `award_xp(member_id, realm_id, 25)` which itself updates `memberships.xp + .level + .last_active + .updated_at`. | Database is the ownership boundary for XP — any client writing `completed=true` triggers the award, no client-side trust needed. |
| C | **Level calculation function** | `calculate_level(total_xp)` — 1/2/3/4/5 thresholds at 0/100/300/600/1000 XP. Exact SQL from TAD §8.1. `IMMUTABLE` so Postgres can inline. | Centralised in one function per TAD; no client-side level math so we can't drift from the server. |
| D | **Realtime subscription** | Member's browser subscribes to `postgres_changes` on `public.memberships` filtered `member_id=eq.<self>`, `event=UPDATE`. On a `new.level !== old.level` payload: (i) fire `eventBus.emit('level-up', new.level)` → Phaser scenes listen → banner animation; (ii) if a Colyseus room is connected, `room.send('UPDATE_LEVEL', { level: new.level })`. | TAD §8.3 exactly. Supabase is source of truth; Colyseus is session cache. |
| E | **Where the subscription lives** | A new `useLevelSync(member, colyseusRoom)` hook in `apps/web/components/game/net/` — a single subscription per mounted Phaser surface (World / Tavern / Academy / Market). The World + Tavern mounts already own Colyseus connections; Academy + Market mount the hook without a room so only the banner fires. | Hook pattern keeps the concern in one file; each Phaser surface drops in `useLevelSync` identically. |
| F | **Colyseus `UPDATE_LEVEL` handler** | Already stubbed in `apps/game-server/src/rooms/realm-handlers.ts` from Phase 2 (`applyUpdateLevel`). Confirm it validates `1 ≤ level ≤ 5` and writes `AvatarState.level`. Add a unit test if not already present. | Phase-2 scope included the stub; Phase-5 just exercises it. |
| G | **Level-up banner UI** | A 2-second fullscreen overlay (gold gradient ribbon across the centre, new level + XP required for next bracket). Plain React component mounted via a `LevelUpBanner` portal triggered by `eventBus`. Not a Phaser animation — React overlay is cheaper + looks consistent across all four scenes. | Banner crosses scene boundaries (level-up can fire during `/world` or while reading a course) so a React portal is the single implementation that works everywhere. |
| H | **Peer level-badge update** | The `AvatarState.level` field already drives the remote-avatar badge in World + Tavern. `applyUpdateLevel` in `realm-handlers.ts` mutates it; the schema broadcast propagates to all peers; remote-avatar visuals re-read and call `setVisualsLevel`. | Zero new client work — Phase 2 already implements the rendering path. Phase-5 just confirms it fires end-to-end. |
| I | **Leaderboard re-activation** | The Tavern's `LeaderboardPanel` already subscribes to `memberships` updates + orders by `xp DESC LIMIT 10`. Values were 0 because no XP had ever been awarded. Once the trigger is live, the panel is automatically correct — no code change. | Covered by Phase 2's work; Phase 5 exit-criteria verification is the only thing left. |
| J | **Migration bundle** | Single migration `20260422000002_phase5_gamification.sql`: `calculate_level`, `award_xp`, `on_lesson_complete`, `trg_lesson_complete`, **plus** `get_enrolment_count(course_id)` SECURITY DEFINER from polish Step 13. No schema changes — all PL/pgSQL. **Apply to `arcadia-test` only for local smoke; prod migration deferred per user decision 2026-04-21.** | One cohesive SQL surface; easy to revert (drop trigger + 4 functions). Prod hold protects the live creator loop from any trigger-misfire surprises until local verification passes. |
| K | **Pure helper tests** | `calculate_level` JS mirror in `packages/shared/src/schemas/` (already has `MIN_LEVEL=1, MAX_LEVEL=5`): add a tiny `xp-thresholds.ts` + tests asserting 1/2/3/4/5 at the boundary XP values. Keeps client-side code from drifting if someone displays "X XP until next level" later. | Pure + testable; mirrors the server function without duplicating its authority (DB trigger still writes the level). |
| L | **RLS test additions** | One new case in `rls-cross-member-leakage.test.ts`: another member setting `completed=true` on their own `lesson_progress` must not award XP to me (already implicit in the trigger, but the test pins it). | Matches the Phase-3 test density; two-line test. |
| M | **Perf pass** | 60 FPS measurement in Chrome DevTools Performance panel against `/world`, `/tavern`, `/academy`, `/market` with the real 2025-04 art loaded. Record in the Phase-5 status entry. No code changes unless we dip under 58 FPS sustained. | Phase-plan §Phase 5 exit criteria explicitly calls for it. |

---

### Locked decisions (Phase 5)

| Decision | Value | Source |
|---|---|---|
| XP source (MVP) | Lesson completion only (+25) | A |
| XP formula levels | 1 (0-99), 2 (100-299), 3 (300-599), 4 (600-999), 5 (≥1000) | TAD §8.1 |
| Level clamp | `1 ≤ level ≤ 5` in both `calculate_level` and `applyUpdateLevel` | TAD §5.3 + §8.1 |
| Realtime channel | `postgres_changes` on `public.memberships`, filter `member_id=eq.<self>`, event `UPDATE` | TAD §8.3 |
| Colyseus message | `UPDATE_LEVEL { level }` to the current room only | TAD §5.3 + existing `MSG` constants in `@arcadia/shared` |
| Banner render | React portal; 2 s display; `level-up` event fired via a singleton `eventBus` | G |
| Migration | `20260422000002_phase5_gamification.sql`, PL/pgSQL only, no schema changes | J |

---

### Steps

1. **Migration `20260422000002_phase5_gamification.sql`.** `calculate_level(int) returns int`, `award_xp(uuid, uuid, int) returns void`, `on_lesson_complete() returns trigger`, `trg_lesson_complete after insert or update on lesson_progress`. Apply to arcadia-test + arcadia prod. `grant execute` to `authenticated` on `award_xp` (defensive — trigger runs as definer anyway).
2. **Pure `xp-thresholds.ts` helper + tests** in `packages/shared/src/schemas/`. Exports `XP_LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000] as const` + `levelForXp(xp)`. 5 unit tests at boundaries.
3. **Smoke the trigger** via Supabase SQL editor: update a `lesson_progress.completed` row to `true`; verify `memberships.xp += 25` + `level` recomputed.
4. **`useLevelSync(memberId, colyseusRoom?)` hook** at `apps/web/components/game/net/use-level-sync.ts`. Subscribes to postgres_changes filtered to self on mount; on level delta fires `eventBus.emit('level-up', newLevel)` + (if room) `room.send(MSG.UPDATE_LEVEL, { level })`. Cleanup on unmount.
5. **`eventBus` singleton** at `apps/web/components/game/net/event-bus.ts` — a tiny typed `EventTarget` wrapper. Two events today: `level-up` (number) + extensible for Phase 6.
6. **`<LevelUpBanner />` React component** at `apps/web/components/game/LevelUpBanner.tsx`. Client component; `useEffect` listens for `level-up`; renders a portal-anchored animated overlay for 2 s; CSS keyframes for a subtle zoom-in + gold gradient. Fully self-contained.
7. **Wire hook + banner** into `GameWorld.tsx`, `GameTavern.tsx`, `GameAcademy.tsx`, `GameMarket.tsx`. One-line additions to each.
8. **Verify `applyUpdateLevel` in game-server.** Already exists per Phase 2; add a unit test if missing: "level < 1 or > 5 is rejected; valid level mutates `AvatarState.level`".
9. **RLS test extension** in `rls-cross-member-leakage.test.ts`: userA upserts their own `lesson_progress.completed=true`, admin query confirms userA's XP went up and userB's didn't.
10. **Leaderboard sanity check.** Load the Tavern with at least two members, one of whom has completed a lesson → XP delta shows + order updates live via the existing Realtime subscription.
11. **60 FPS measurement.** DevTools Performance recordings on `/world`, `/tavern`, `/academy`, `/market` on a mid-range laptop (M-series Mac or Ryzen 5 minimum). Record the median + p95 frame times in `phase-05_status.md`. If p95 frame time ever exceeds 20 ms, note the scene + open a polish follow-up.
12. **Demo-cut checklist.** Walk through the full creator → member → level-up loop on prod in one take. Note any rough edges (camera stutter, loading hiccups, text clipping) and fix only the blocking ones.

---

### Bundled polish steps (approved 2026-04-21)

Five items pulled from `phases/phase-02_polish_backlog.md` and Phase-4 punts. All sized to 30 min – 2 hours.

13. **Stall enrolment-count RPC.** The Market currently shows "0 enrolled" on every stall because `enrolment_self_read` RLS hides other members' rows. Add `get_enrolment_count(course_id uuid)` SECURITY DEFINER function returning an integer (published-course guard inside the body). Call it per-course in `app/market/page.tsx`'s server fetch and stop passing zeros to `MARKET_STALLS_REGISTRY_KEY`. Same migration as Phase-5 gamification (same `.sql` file; keeps the polish bundle coherent).

14. **Leaderboard display-name fallback.** `LeaderboardPanel` currently renders `memberships.display_name` directly — null rows show as empty strings. Add a small fallback chain in the panel: `display_name → AVATAR_NAMES[avatar_id] → "Player"`. Pure client-side change; no schema work. Ship with Phase-5 since XP finally populates the leaderboard.

15. **Interior colliders scaffold.** Add a `colliders: readonly PixelRect[]` entry to each image-backed scene's `layers.config.ts` (Tavern, Academy, Market). `scenes/shared/colliders.ts` helper builds a `StaticGroup` from the config + wires `scene.physics.add.collider(localAvatar, group)` in one line. Ship with empty arrays as defaults — avatar still walks over everything until user supplies rects. User fills in per scene via a follow-up commit when ready (separate JSON coords would be a nice pairing but is optional). Unit test the helper against a synthetic rect list.

16. **Building-entry art triage.** Quick pass on `/world`: confirm the Tavern + Market building-entry tiles still use Phase-1 invisible placeholders, flag which ones block the demo visually. If any are jarring enough that a demo viewer would notice, drop a single decor-layer gid over each (temporary placeholder, not final art). User decides per building.

17. **Reactions UI re-add (conditional).** Backend `toggle_reaction` RPC + RLS tests have been live since Phase 2; only the `ReactionPicker.tsx` UI was removed. If time permits in the Phase-5 window, cherry-pick commit `44c577a` from branch `phase-02-chat-polish-v2` back onto main and re-wire it into the current speech-bubble chat. **Skip entirely** if the Phase-5 loop work runs long; the reaction backend can wait indefinitely.

---

### Test criteria (Phase 5 exit)

1. **XP awarded.** Member marks lesson complete → `memberships.xp += 25` + `level` recomputed in DB. Admin query confirms.
2. **Level-up banner.** Member with 99 XP completes one lesson → banner animates on-screen with "Level 2". Dismissable or auto-hides after 2 s.
3. **Peer level sync.** Member A levels up in Tavern → Member B (in Tavern) sees A's level badge tick up without reloading.
4. **Live leaderboard.** Tavern leaderboard panel shows non-zero XP for anyone who's completed a lesson. Order + values update on Realtime `UPDATE` without a page reload.
5. **60 FPS.** Every scene holds ≥58 FPS median on the reference machine.
6. **CI green.** Typecheck + lint + tests across all three workspaces. RLS suite runnable when `TEST_SUPABASE_*` env is set.
7. **No regressions.** All prior smoke tests (Phase 3 creator flow, Phase 4 market flow) still work end-to-end.
8. **Bundled polish exit.** Stall enrolment counts render a non-zero number when any member is enrolled; leaderboard shows "Player" (or avatar-canonical name) for members with no `display_name` set instead of an empty row; each image-backed scene has a `colliders: []` entry in its config (populated later by user-supplied coords without code changes).

---

### Risks / unknowns

1. **Trigger firing twice.** `lesson_progress` upserts via `onConflict` can trigger both INSERT + UPDATE paths depending on row existence. The `IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE)` guard handles the transition case; a fresh INSERT with `completed=true` (no OLD row) also passes because `OLD.completed IS NULL`. **Mitigation:** unit-verify via SQL editor after migration; reject silently if double-fire ever shows up in `pg_stat_activity`.
2. **Realtime subscription latency.** Supabase Realtime typically <500 ms but can spike during outages. Member might complete a lesson and not see the banner for several seconds. **Mitigation:** accept for MVP; flag as polish if it becomes annoying during demo rehearsal.
3. **Two active subscriptions per tab.** If member is in `/world` and opens `/academy` in a new tab, each tab subscribes to its own `memberships` update channel. Both would fire `UPDATE_LEVEL` to different rooms. **Mitigation:** harmless — each tab owns its own Colyseus connection; `applyUpdateLevel` is idempotent.
4. **60 FPS on real art.** The new interior PNGs are heavy (3 MB each for Tavern + Academy + Market). Initial load is fine (they're cached); sustained rendering might bottleneck on GPU if the browser can't composite at 60 Hz. **Mitigation:** measure first; if we dip, the fix is a compressed WebP build of each interior (5-10× smaller with same perceived quality) — 30-min swap.
5. **Level clamp mismatch.** If `memberships.level` has a check constraint of `1-5` but `calculate_level` ever returns outside that range, the UPDATE fails silently. **Mitigation:** `calculate_level` body above caps at 5; unit test the function.
6. **Older lesson_progress rows pre-Phase-5.** Rows that were already `completed=true` before the trigger existed never fired an award. A backfill migration could scan them + award retroactively; for MVP we explicitly don't backfill (demo runs on fresh accounts anyway). **Mitigation:** document in the status entry as a known edge for post-MVP.

---

### What I need from you before starting

**All approved 2026-04-21:**

- Decisions A–M locked as recommended.
- **Migration timing: local first.** Apply `20260422000002_phase5_gamification.sql` to `arcadia-test` only for the duration of Step 1 → Step 10. Prod migration happens after the banner demos locally (or on a Vercel preview pointed at arcadia-test, whichever we do). **Nothing Phase-5 hits prod until the local smoke is green.**
- **Bundle polish backlog.** Phase-5 expands from 12 steps to 17, adding: stall enrolment-count RPC, leaderboard display-name fallback, tavern+academy+market colliders scaffold, and academy-art punt triage. See the bundled-polish steps below.

Step 1 kicks off immediately.
