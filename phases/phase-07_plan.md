## Phase 7 Plan: Gameplay polish — scene fidelity + reliability

**Source:** Post-MVP. User punch list delivered 2026-04-23 after a play-through of the current live surfaces. The MVP phase-plan ends at Phase 5; Phase 7 is a scene-polish pass.

**Goal:** Every existing Phaser scene and its in-world React overlays land at demo quality. Spawn points, triggers, text legibility, camera bounds, jump availability, and a small set of React-overlay bugs (market enrol state, academy progress/tick) are all addressed. No new features; no new data model; no migrations.

**Relationship to Phase 6:** Phase 6 (scriptorium UI reskin of login/dashboard/hub) is **deferred until after Phase 7**. Rationale from the user call: Phase 7 targets live bugs and polish on surfaces players already touch; Phase 6 is aesthetic reskin on working surfaces. Playtest benefits from 7 first. `phases/phase-06_plan.md` remains on disk untouched and is picked up after 7 exits.

**Constraint:** Another Claude Code session is actively working in `/design/`. Phase 7 **must not write** to `/design/**`. Reading `/design/areas/*.md` and `/design/system/*.md` for reference is allowed and expected (e.g. 7.3 styles the market StallView against `design/areas/market.md`'s commitments). If a finding in Phase 7 would update a design doc, record it in the phase-07 status log and defer the design-doc write until the /design/ session lands.

**Out of scope (Phase 7 explicit):**
- **Academy React viewer rebuild** (Outlook 3-pane sidebar UI, lesson/content split). Items AC5 + AC7. Separate phase — sized small-week, too much for this pass.
- **Background music.** Item G3. Deferred pending asset availability and audio-manager design.
- **New migrations / RLS changes / server actions.** This phase is client-side polish. Any DB-layer discovery pauses the phase and reopens scope.
- **Phaser scene redesigns** in the scriptorium direction. Phase 6 owns aesthetic reskins of React surfaces; Phase 7 stays functional.

---

### Pre-plan decisions — locked (approved 2026-04-23)

| # | Decision | Value |
|---|----------|-------|
| 1 | Sequencing vs Phase 6 | Phase 7 first; Phase 6 deferred |
| 2 | Academy routing "bug" (AC4) | Not a bug — locked-course copy rendering as designed. Removed from scope. |
| 3 | Coworking tent-exit spawn (CW2) | Return to the tent the player entered from, not a shared campfire point |
| 4 | Background music (G3) | Deferred |
| 5 | Academy React viewer rebuild (AC5, AC7) | Deferred to a later phase |
| 6 | "Search Stall" button (M5) | Remove entirely |
| 7 | "Return to World" buttons (AC9, M4) | Remove — edge-exit triggers cover the same affordance |
| 8 | `/design/` access | Read-only this session |

---

### Item-to-sub-phase map

| Item | Description | Sub-phase |
|------|-------------|-----------|
| G1 | Avatar name font quality | 7.0 |
| G2 | ENTER-prompt on outdoor→interior transitions | 7.0 |
| S1 | NPC msg-bubble font too pixelated | 7.0 |
| T3 | Chat bubble clips name | 7.0 |
| AC2 | ENTER prompt clips name | 7.0 |
| AC8 / M2 | No jump in academy / market interiors | 7.0 |
| AC1 / T1 / M3 / CW1-bg | PNG not filling space (square, academy, tavern, market, coworking-inside tent) | 7.0 |
| S2 | Spawn off going square → coworking | 7.1 |
| S3 | Spawn from coworking → square should be left bridge | 7.1 |
| S4 | Square occupancy UI polish | 7.1 |
| S5 | Market trigger confined to bridge only | 7.1 |
| CW3 | Tent-entering trigger position off | 7.1 |
| AC9 | Remove "Return to World" button (academy) | 7.2 |
| AC10 | Exit trigger at bottom of academy interior | 7.2 |
| T2 | Tavern leaderboard UI rehaul | 7.2 |
| T4 | Tavern spawn near exit on enter | 7.2 |
| M1 | Market entry point from top of PNG | 7.2 |
| M4 | Remove "Return to World" button (market) | 7.2 |
| M5 | Remove "Search Stall" button | 7.2 |
| CW1-rest | Tent occupancy UI bad, avatar too small | 7.2 |
| CW2 | Tent-exit spawn = entry tent | 7.2 |
| M6 | Hide enrol CTA if already enrolled | 7.3 |
| M7 | Diegetic purchase/browse UI | 7.3 |
| AC3 | Academy progress bar unreliable | 7.4 |
| AC6 | Tick / complete unreliable | 7.4 |
| G3 | Background music | DEFERRED |
| AC5 / AC7 | Academy viewer rebuild | DEFERRED |

---

## Sub-phase 7.0 — Cross-cutting foundations

**Scope:** Shared fixes that touch multiple scenes or their base classes. Land first so 7.1–7.4 can call into them without re-deriving.

**Reads first:** `apps/web/components/game/scenes/shared/outdoor-scene-base.ts`; every per-scene `CLAUDE.md`; whichever file owns avatar-name rendering (likely `apps/web/components/game/LocalAvatar.ts` or a sibling).

### Steps

1. **Text-rendering audit + fix (G1, S1, T3, AC2).** Locate every in-world Text object: avatar name tag, NPC speech bubble, player chat bubble, ENTER prompt. Record their current font family / size / `resolution` / `setScale` / container structure. Pixelation symptom means one of: (a) bitmap font used instead of webfont, (b) `resolution: 1` on a HiDPI display (should be `window.devicePixelRatio`), (c) sprite re-scaled from a smaller source. Fix all four in one pass — the root cause is usually shared. Document the chosen technique in `phase-07_status.md`.
2. **Name-clip audit (T3, AC2).** The chat bubble and the ENTER prompt both overlap the avatar name tag because they're anchored at the same y-offset above the sprite. Separate the layers: name tag stays at `y - sprite.displayHeight - 12`; bubbles and prompts anchor at `y - sprite.displayHeight - 44` (or equivalent). Verify on the three avatars used in the demo.
3. **Jump binding in interior scenes (AC8, M2).** `outdoor-scene-base` wires SPACE → jump on every outdoor scene. Interior scenes (academy, market, tavern, coworking-inside) don't inherit from it. Options: (a) extract an `InteriorSceneBase` and extend each interior from it; (b) add the SPACE binding via a shared helper (`scenes/shared/jump-binding.ts`). Prefer (b) — lighter, no schema change. Wire it into each interior's `create()`.
4. **ENTER-prompt pattern generalisation (G2).** `academy-outside` already has "PRESS ENTER to visit Academy" per its CLAUDE.md. Check whether the pattern lives on the scene or in `outdoor-scene-base`. If scene-local, hoist to the base: `entryTriggers[i]` gains a `mode: 'instant' | 'enter-prompt'` (default `'instant'` to keep `square`'s existing edge-exits unchanged). Tavern-outside and coworking-outside adopt `'enter-prompt'` per the item. Verify academy-outside still works.
5. **Image-fill audit (AC1, T1, M3, CW1-partial).** For each scene in {square, academy-interior, tavern-interior, market, coworking-inside}, compare `camera.config.ts` bounds × zoom against the source PNG dimensions. The "PNG not filling space" symptom means one of: (a) camera bounds are smaller than PNG (black bars visible beyond the image), (b) camera zoom × viewport width > image width × zoom (image doesn't cover viewport), (c) image scaled too small at render time. Record each scene's current measurements; fix by raising zoom, matching bounds to PNG size, or flagging an art-request if image resolution is genuinely insufficient. Art-request items go into a separate follow-up — do NOT block Phase 7 on new art.

### 7.0 exit criteria

1. Avatar name, NPC bubble, chat bubble, ENTER prompt all render crisply on a HiDPI display.
2. Name tag and overlapping bubbles no longer collide vertically.
3. SPACE makes the avatar jump in academy, market, tavern, coworking-inside.
4. Entering an outdoor→interior trigger on academy-outside, tavern-outside, coworking-outside shows "PRESS ENTER to visit X" and only navigates on ENTER.
5. Square, academy-interior, tavern-interior, market, coworking-inside each render with no black bars / no unfilled area. If an art-asset limit is hit, it's logged with a specific art-request ticket; Phase 7 does not author new art.

---

## Sub-phase 7.1 — Outdoor scenes

**Scope:** square, academy-outside, tavern-outside, coworking-outside. Spawn points, triggers, one React-overlay polish.

**Reads first:** each outdoor scene's `layers.config.ts` + `sprites.config.ts`; `apps/web/components/game/scenes/square/SquareScene.ts` specifically (largest); the React overlay component for square occupancy.

### Steps

1. **Square↔coworking spawn correctness (S2, S3).**
   - S2: entering coworking-outside from square (bottom of square → top of coworking-outside): adjust `coworking-outside/sprites.config.ts` `spawnFromSquare` coord so the avatar lands naturally inside the scene, not on the edge.
   - S3: returning to square from coworking-outside: adjust `square/sprites.config.ts` `spawnFromCoworking` to the left-bridge coord (user's explicit spec). Verify bridge position from the square PNG and set the coord.
2. **Market trigger confined to the bridge (S5).** In `square/layers.config.ts`, narrow the market `entryTriggers[].shape` from its current (likely large) footprint to a tight rect over the bridge. Verify triggered-only-when-on-bridge by walking around it in dev.
3. **Square occupancy UI polish (S4).** Locate the React overlay (probably `SquareOccupancy.tsx` or inside the existing square mount). Improve visual: legible type, tilted vellum chip feel, Caveat body if it fits. Align with the scriptorium voice but **do not write to `/design/`**. Match `/design/system/voice.md` copy pattern (read-only reference): something like `31 present · ~ the lantern is lit ~`.
4. **Tent-entering trigger position (CW3).** Determine which scene owns the tent entry: if coworking-inside (tents inside the coworking floor, player enters a tent → a tent interior), fix `coworking-inside/layers.config.ts` tent triggers. If it's on coworking-outside (tents outside), fix there. Walk the coords against the PNG; adjust until the trigger fires at the tent entrance, not beside it.
5. **Apply 7.0 ENTER-prompt to tavern-outside + coworking-outside.** Implementation landed in 7.0; this step flips the `mode` field on each scene's relevant `entryTriggers[i]` from `'instant'` → `'enter-prompt'` + sets prompt copy ("PRESS ENTER to visit the tavern" / "...the coworking space").

### 7.1 exit criteria

1. Entering coworking-outside from square + returning to square both spawn on reasonable coords. Square return spawn = left bridge verified by eye.
2. Market trigger fires only on the bridge.
3. Square occupancy indicator looks polished.
4. Tent entry trigger fires at the tent door, not beside it.
5. Tavern-outside and coworking-outside gate entry behind ENTER prompt.

---

## Sub-phase 7.2 — Interior scenes (Phaser polish)

**Scope:** academy, tavern, market, coworking-inside. No React viewer changes (those sit in 7.4 and the deferred viewer-rebuild phase). Market React StallView sits in 7.3.

**Reads first:** each interior scene's `camera.config.ts`, `sprites.config.ts`, `layers.config.ts`; the React overlay per interior (for the `Return to World` + `Search Stall` buttons); `LeaderboardPanel.tsx` for T2.

### Steps

1. **Academy — remove "Return to World" button (AC9).** Likely in `apps/web/app/academy/page.tsx` or a sibling overlay. Remove the button + its handler. Do not remove analogous affordances anywhere else — scope only academy here.
2. **Academy — add bottom-edge exit trigger (AC10).** In `academy/layers.config.ts`, add an `entryTriggers` entry at the bottom of the academy-interior PNG pointing at `/academy-outside`. Match the style of `academy-outside`'s top-edge return.
3. **Tavern leaderboard UI rehaul (T2).** `LeaderboardPanel.tsx`. Replace the current list styling with something closer to the ledger-card aesthetic (numeric rank in `--wax`, bronze hairline dividers, mono for numbers) **by reading** `/design/areas/dashboard.md` and `/design/system/surfaces.md` for reference; do NOT write to `/design/`. Keep the existing Realtime subscription + XP ordering intact.
4. **Tavern — spawn near exit on enter (T4).** Fix `tavern/sprites.config.ts` entry-spawn coord so the avatar lands near the exit door instead of mid-room. Verify exit-proximity visually.
5. **Market — entry from top of PNG (M1).** Fix `market/sprites.config.ts` entry-spawn to a top-of-PNG coord. Verify against the market interior image.
6. **Market — remove "Return to World" button (M4).** Same pattern as AC9. React overlay on `/market` — strip it.
7. **Market — remove "Search Stall" button (M5).** Kill it and any orphaned state. If it was an upcoming feature, note in `phase-07_status.md` so we can revisit.
8. **Coworking-inside — tent occupancy UI + avatar size (CW1-rest).** Avatar: check `coworking-inside/sprites.config.ts` `avatar.size` — should match other interiors' convention (135×135 per recent art changes). Tent occupancy UI: find the React overlay and polish; treat like S4 in 7.1.
9. **Coworking tent exit spawn = entry tent (CW2).** When entering a tent, persist the tent id to Phaser's scene registry (`scene.registry.set('cowork.lastEntry', tentId)`). On exiting the tent, read it and spawn near that tent's door on coworking-inside. Requires minor registry plumbing; no schema or server change.

### 7.2 exit criteria

1. No "Return to World" button in academy or market.
2. No "Search Stall" button in market.
3. Academy has a bottom-edge exit trigger → `/academy-outside`, fading correctly.
4. Market entry from outside lands at the top of the interior PNG.
5. Tavern entry spawns near the exit door.
6. Tavern leaderboard visually improved; before/after screenshots in status.
7. Coworking-inside: avatar size matches other interiors; tent occupancy UI polished; exiting a tent spawns you back beside that tent.

---

## Sub-phase 7.3 — Market React StallView

**Scope:** M6 + M7 — enrolment state + diegetic restyle of the stall modal.

**Reads first:** the current `StallView` component (`apps/web/app/market/_components/StallView.tsx` likely); `apps/web/app/market/page.tsx` for the enrolments data it already fetches; `/design/areas/market.md` and `/design/system/surfaces.md` **read-only**.

### Steps

1. **Enrolment state check (M6).** `/market` already fetches `get_enrolment_count` per course (Phase 5 polish Step 13). Extend the server fetch to also include the viewing member's own `enrolments` rows (`member_id = auth.uid() AND course_id IN <visible>`). Pass through to `StallView`. If the viewer is enrolled, replace the enrol CTA with a "step inside →" button that navigates to `/academy/[courseId]` (the existing React viewer). Test both states by toggling a test account.
2. **Diegetic restyle (M7).** Restyle the modal per `/design/areas/market.md` commitments: map-card modal frame (not a flat white panel), envelope-card course tiles, wax-seal enrol CTA, scribe-name + Caveat tagline header. Use the tokens from `/design/system/tokens.md` (read-only reference) — if tokens aren't wired into `/apps/web` yet (they aren't per Phase 6 plan step 2), inline the hex values for this sub-phase and migrate to tokens when Phase 6 lands. Flag this as tech debt in `phase-07_status.md`.

### 7.3 exit criteria

1. A user enrolled in a course sees "step inside →" instead of "enrol". Clicking navigates to `/academy/[courseId]`.
2. A user NOT enrolled sees the enrol CTA; existing enrol flow works end-to-end.
3. StallView visually reads as a stall scroll on a map-card modal, not a stock white-background modal. Screenshot in `phase-07_status.md`.
4. Tech-debt note in status: migrate inline hex colors → CSS tokens when Phase 6 Step 2 lands.

---

## Sub-phase 7.4 — Academy progress + tick reliability

**Scope:** AC3 + AC6. Bug fixes inside the existing academy viewer. Does NOT include the Outlook 3-pane rebuild (deferred).

**Reads first:** `apps/web/app/academy/[courseId]/**` (whichever file owns the progress bar + tick UI); the Supabase schema for `lesson_progress`; any Realtime subscription on `lesson_progress` (grep); the Phase 5 gamification flow (it writes to `memberships.xp` via trigger on `lesson_progress.completed`).

### Steps

1. **Reproduce both bugs on a test account.** Mark a lesson complete; record what the progress bar shows immediately, on refresh, on navigating away + back. Toggle the tick; record whether it persists. Capture exact repro in `phase-07_status.md`.
2. **Root-cause the progress bar (AC3).** Suspects: (a) client-side lesson-complete-count isn't recounting after an update, (b) the query is stale because there's no Realtime subscription on `lesson_progress` for this page, (c) the progress calculation divides by the wrong denominator (e.g. only published lessons vs all lessons). Fix per root cause.
3. **Root-cause the tick persistence (AC6).** Suspects: (a) optimistic update not persisted to server, (b) the row-update succeeds but the UI reads from a stale server snapshot, (c) an RLS check is quietly rejecting the write. `EXPLAIN` the UPDATE if needed via Supabase MCP (read-only — we can't execute writes there).
4. **Single cohesive fix.** Both bugs very likely share a cause (a missing Realtime subscription on `lesson_progress` for the viewing member). Prefer one subscription + one reducer. Add a focused Vitest covering the progress-bar math and a manual test plan for the subscription behavior.

### 7.4 exit criteria

1. Marking a lesson complete updates the progress bar immediately + correctly.
2. The tick persists across navigation + refresh.
3. Existing Phase 5 XP award trigger still fires on `completed=true` (regression check).
4. Test coverage: unit test for the progress calculation (pure function); manual acceptance test documented in status.

---

## Phase 7 global test criteria (checked at end of 7.4)

1. Every non-deferred punch-list item from the 2026-04-23 review shipped, or explicitly removed from scope (as AC4 was).
2. No regression in Phase 5 gamification: lesson-complete still awards +25 XP; level-up banner still fires; leaderboard still sorts.
3. No regression in existing auth / dashboard / course CRUD.
4. Demo-cut walkthrough (the one Phase 5 parked as Step 12) runs clean on the polished scenes without the original issues recurring.
5. `phases/phase-07_status.md` has a dated exit entry listing every item shipped + every item deferred with reason.

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Text-rendering fix requires a Phaser config-wide change that affects perf | Low-Medium | Profile a `/world` session before + after the fix. If p95 frame-time regresses > 2 ms, isolate which text primitive caused it. |
| Image-fill audit reveals a source PNG genuinely smaller than needed | Medium | Log an art-request ticket; do NOT author new art in Phase 7. Scene stays as-is until the asset lands. |
| Coworking "return to entered tent" requires more state than a registry key | Low | If scene registry isn't enough, fall back to a per-session ref in the Phaser scene class. Still client-only. |
| Tavern leaderboard rehaul drifts into scriptorium-reskin territory (Phase 6 work) | Medium | Cap the rehaul: numeric rank styling + dividers only. Full scriptorium styling waits for Phase 6. Note the cap in the sub-phase PR. |
| AC3 + AC6 turn out to be server-side (RLS, trigger) bugs | Low-Medium | If the root cause is in Postgres, pause 7.4 and write an ADR before changing the DB. Do NOT migrate inside Phase 7. |
| Scope creep from each scene polish dragging in "while we're here" refactors | Medium | Every PR is reviewed against the item-to-sub-phase map. Out-of-map work goes to a backlog, not this phase. |
| Conflict with the other Claude session working in `/design/` | Low if we don't touch it | Rule #8 locked: read-only this session. If a Phase 7 finding would update a design doc, it's logged in status and handed off. |

---

## Naming + commits

- **Branch:** `phase-07_gameplay-polish` (single branch)
- **Sub-phase commits prefix:** `7.0:`, `7.1:`, `7.2:`, `7.3:`, `7.4:`
- **PR per sub-phase** — title `phase-07.N: <scope>`
- **Status log:** `phases/phase-07_status.md` — chronological entries newest-on-top, matching Phase 5 format
- **Changelog:** single entry at phase exit, `docs/changelog/YYYY-MM-DD_phase-07-polish.md`

---

## Deferred to a later phase (record kept here so it doesn't get lost)

- **Phase 6 (scriptorium UI reskin — doorway + host + hub).** `phases/phase-06_plan.md` is on disk, ready to resume after Phase 7.
- **Academy React viewer rebuild** (Outlook 3-pane sidebar + content). Items AC5, AC7.
- **Background music per scene.** Item G3.
- **Any design-doc updates** that arise during Phase 7 findings — hand off to the /design/ session.
