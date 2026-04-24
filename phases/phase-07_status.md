# Phase 7 — Status

Source plan: `phase-07_plan.md`. Entries chronological, newest on top.

## 2026-04-23 — 7.0 steps 1 + 2 shipped (text rendering + name clip)

**Items covered in this pass:** G1 (avatar name font quality), S1 (NPC bubble pixelated), T3 (chat bubble clips name), AC2 (ENTER prompt clips name). Step-2 name-clip audit rolled into the step-1 fix pass — they were intertwined.

### Audit findings

Every in-world `Phaser.GameObjects.Text` was created at `resolution: 1` (the default). On HiDPI displays (Retina Mac = DPR 2, high-end Windows = DPR 1.25–2.5) Phaser draws the glyphs at 1× canvas resolution and the browser upscales, which is exactly the pixelation the user reported.

Six sites found:

| Site | File · line | Font | Size | Fix |
|------|-------------|------|------|-----|
| Avatar name tag | `world/avatar-renderer.ts:74` | Georgia serif bold | 20px | resolution bumped |
| NPC speech bubble | `square/SquareScene.ts:286` | system-ui → **Georgia** | 16px → **17px** | resolution + font upgrade |
| Tavern speech bubble | `tavern/TavernScene.ts:84` | system-ui → **Georgia** | 12px → **14px** | resolution + font upgrade |
| ENTER prompt | `shared/enter-prompt.ts:71` | Courier → **Georgia** | 20px | resolution + face match (prompt now reads as in-world, not a dev HUD) |
| Capacity HUD | `shared/capacity-hud.ts:25` | system-ui → **Georgia bold** | 13px → **14px** | resolution + font upgrade (S4 partial credit) |
| Tavern exit hint | `tavern/TavernScene.ts:172` | Georgia bold | 32px | resolution |
| Member count badge (world) | `world/member-count-badge.ts` | — | — | **SKIPPED** — `WorldScene` is not routed anymore per its own CLAUDE.md |

### Fix shipped

1. **New module** `apps/web/components/game/scenes/shared/crisp-text.ts` — exports `CRISP_TEXT_RESOLUTION` (clamped to `[2, 3]`, defaults to `window.devicePixelRatio`) + `addCrispText(scene, x, y, text, style)` drop-in replacement for `scene.add.text`. Guarded `typeof window !== 'undefined'` so Vitest picks it up without jsdom tripping.
2. **Every call site** above switched from `scene.add.text(...)` → `addCrispText(scene, ...)`. Font unified to Georgia/Cambria serif stack across bubbles + HUD + prompt so the in-world text feels cohesive (previously a mix of system-ui, Courier New, and Georgia).
3. **Name-clip fixes:**
   - `TavernScene.ts` — `SPEECH_BUBBLE_Y_OFFSET` raised `64 → 110`. Bubble now floats ~15px above the name-tag top instead of overlapping ~21px.
   - `shared/enter-prompt.ts` — prompt container offset raised `-90 → -130`. Clears the name tag on 135px outdoor avatars.
4. **Final sweep** — `grep -rn '\.add\.text\b'` across `components/game` now returns only `crisp-text.ts` itself. No orphaned raw Text objects.

### Verification

- **Typecheck:** `npx tsc --noEmit` clean in `apps/web`.
- **Vitest:** 191 passed · 23 skipped · 0 failed across 23 files. Includes `enter-prompt.test.ts` (4 tests) — the container-offset change is at render time, not covered by the pure-function test, so no assertion update needed.
- **Visual verify:** deferred to user play-through. Expected result: all in-world text crisp on Retina, name tag no longer clipped by speech bubble or ENTER prompt.

### Out of scope for this pass

- Member-count badge (`world/member-count-badge.ts`) — `WorldScene` is not routed since 2026-04-22. The badge code is orphaned. Cleanup lives in a future follow-up commit, not Phase 7.
- Full scriptorium styling of the capacity HUD (S4 — "occupancy UI should be better") — font + size bump landed here; the broader visual polish (vellum chip, Caveat marginalia) is a 7.1 step.

### Scope guardrail met

Per Phase 7 plan, scope was "client-side polish, no schema/migration/server-action changes." Confirmed — this pass is TypeScript-only inside `apps/web`.

**Next:** 7.0 step 3 — jump binding in interior scenes (AC8 academy, M2 market). Tavern already has SPACE→jump; replicating the pattern into academy + market.

---

## 2026-04-23 — 7.0 steps 3, 4, 5 shipped (jump, ENTER-prompt on Square edges, image-fill)

### Step 3 — jump binding in interiors (AC8, M2)

**Findings:** Tavern and Coworking-inside had SPACE→jump wired inline. Academy and Market never wired it.

**Ship:** new `scenes/shared/jump-binding.ts` exports `createJumpBinding(scene)` returning `{ spaceKey, tryJump, destroy }`. Call sites: `AcademyScene.wireKeyboardInput()` and `MarketScene.wireKeyboardInput()` now instantiate the binding; their `update()` loops call `this.jumpBinding?.tryJump(this.localAvatar)` once per frame.

**Scope guardrail:** Tavern + Coworking-inside were NOT migrated to the helper. They already work; per CLAUDE.md "a bug fix doesn't need surrounding cleanup." Future tidy-up can migrate them for DRY.

### Step 4 — ENTER-prompt on Square's 4 cardinal edges (G2)

**Findings:** Academy-outside, tavern-outside, coworking-outside already had ENTER prompts via `createEnterPromptManager` (circular triggers). But the SQUARE's 4 cardinal exits (N→academy-outside, E→tavern-outside, S→market, W→coworking) used `createEdgeTriggerManager` with walk-onto behavior — you'd instantly transition by stepping on the edge. That's what the user's G2 complaint was really about.

**Ship:** extended `scenes/shared/edge-triggers.ts` with an optional `promptLabel` field on `EdgeTriggerConfig`. When set, walking into the edge band shows a prompt pill (same visual style as `enter-prompt.ts`, inlined for self-containment) and only ENTER navigates. When omitted, behavior is unchanged (instant — still used by every outdoor scene's return edge). `EdgeTriggerManager.update(ax, ay, enterJustDown?)` gains an optional third argument.

Square's 4 edges now carry prompt labels:
- top → `Press ENTER to visit the Academy grounds`
- right → `Press ENTER to visit the Taverns`
- bottom → `Press ENTER to visit the Market`
- left → `Press ENTER to visit the Coworking tents`

`SquareScene` gains an `enterKey` field; its `update()` computes `Phaser.Input.Keyboard.JustDown(enterKey)` and passes it through. Threshold 300px retained from the walk-onto era.

**Note on S5 (market trigger confined to bridge):** left for 7.1. Current ENTER prompt fires on the full south strip within 300px of the bottom edge. 7.1 step 2 will add a horizontal-span restriction so it only fires over the bridge.

### Step 5 — image-fill audit + fix (AC1, T1, M3, CW1-partial)

**Findings:** Every scene uses `Phaser.Scale.RESIZE` (canvas = container). Cameras use a static `zoom` from config. When `world × zoom < viewport`, Phaser renders black canvas beyond the image — exactly the "not filling space" complaint.

Measurements (configured vs fill-required zoom):

| Scene | World | Config zoom | Min fill @ 1920×1080 | Min fill @ 2560×1440 |
|-------|-------|-------------|---------------------|---------------------|
| Square | 2508×2508 | 0.6 | 0.766 | 1.021 |
| Tavern | 1536×1024 | 1.0 | 1.250 | 1.667 |
| Academy | 1536×1024 | 1.0 | 1.250 | 1.667 |
| Market | 1536×1024 | 1.0 | 1.250 | 1.667 |
| Coworking-inside | 2508×2508 | 1.0 | 0.766 | 1.021 |

Square at 0.6 is underfilled on every common viewport. All three 1536×1024 interiors are underfilled on 1080p+. Coworking-inside at 1.0 is fine at 1080p but underfilled at 1440p.

**Ship:** new `scenes/shared/fill-zoom.ts` exports two pure-ish helpers:
- `fillZoomFor(canvasW, canvasH, worldW, worldH)` — unit-testable, no Phaser.
- `applyFillZoom(scene, worldW, worldH, configuredZoom)` — sets `cameras.main.setZoom(Math.max(configured, fill))`.

Wired into Square, Tavern, Academy, Market, CoworkingInside:
1. In `create()` — replaces the direct `cameras.main.setZoom(zoom)` call.
2. On `scale.on('resize')` — re-fits when the browser is resized.

Design-zoom is preserved as a floor: on a 1366×768 display the Tavern stays at zoom 1.0 (its "see the whole room" intent); on a 1920×1080 display it auto-bumps to 1.25 (eliminates black bars). No art-request needed — all image sources are large enough to fill any realistic viewport at zoom ≤ ~2.5.

**Outdoor scenes (academy-outside, tavern-outside, coworking-outside):** not touched — the user didn't flag them and they have much larger source images (2508×2508 / 2806×2242). Preventive application deferred to a follow-up if reports come in.

### Verification for 7.0 as a whole

- **Typecheck:** clean in `apps/web`. (Only error is the pre-existing `app/doorway/page.tsx(36,17)` — the other Claude session's Phase 6 WIP, not touched.)
- **Vitest:** 191 passed · 23 skipped · 0 failed.
- **Manual verify (owed):** visual pass in Chrome against `/world` (square), `/tavern`, `/academy`, `/market`, `/coworking/inside?b=tent-1`. Crisp text + visible ENTER prompts on Square edges + full viewport fill + SPACE jump in academy/market.

### Files shipped this sub-phase

New:
- `scenes/shared/crisp-text.ts`
- `scenes/shared/jump-binding.ts`
- `scenes/shared/fill-zoom.ts`

Modified:
- `scenes/world/avatar-renderer.ts`
- `scenes/shared/enter-prompt.ts`
- `scenes/shared/edge-triggers.ts`
- `scenes/shared/capacity-hud.ts`
- `scenes/square/SquareScene.ts`
- `scenes/square/layers.config.ts`
- `scenes/tavern/TavernScene.ts`
- `scenes/academy/AcademyScene.ts`
- `scenes/market/MarketScene.ts`
- `scenes/coworking-inside/CoworkingInsideScene.ts`

### 7.0 exit criteria — status

| # | Criterion | State |
|---|-----------|-------|
| 1 | Avatar name + NPC bubble + chat bubble + ENTER prompt crisp on HiDPI | ✅ shipped (owes manual verify) |
| 2 | Name tag no longer collides with overlapping bubbles | ✅ shipped |
| 3 | SPACE jumps in academy, market, tavern, coworking-inside | ✅ shipped (tavern + coworking-inside were already working; academy + market now wired) |
| 4 | ENTER prompt on outdoor→interior transitions | ✅ already shipped per the 3 outdoor scenes; **Square's 4 exits also now ENTER-gated** per user's actual G2 intent |
| 5 | Square / academy / tavern / market / coworking-inside all fill the viewport | ✅ via fill-zoom; art-request not needed |

**Pre-existing build error flag:** `app/doorway/page.tsx(36,17)` fails tsc — a component passed `className` to something that only accepts `{ size?, style? }`. This is the other Claude session's Phase-6 WIP territory. Not touched. Flagging so it doesn't get lost.

**Next:** 7.1 — outdoor scene polish. Square↔coworking spawn correctness (S2, S3), market-trigger bridge confinement (S5 — horizontal span restriction on the ENTER-prompt edge), tent trigger reposition (CW3), square occupancy UI polish (S4).

Recommend a visual-verify pause here before 7.1 so user can confirm 7.0 on a live dev server. Key things to check:
- Resize browser across 1080p / 1440p: every scene fills without black bars.
- Avatar name + NPC bubble + chat bubble + ENTER prompts look crisp on Retina.
- On Square, walking toward any edge shows the ENTER prompt instead of instantly warping.
- SPACE triggers jump in Academy + Market.

---

## 2026-04-23 — 7.1 / 7.2 / 7.3 iterated in real-time on preview

16 commits on `phase-07_gameplay-polish` after the 7.0 baseline. Summary by surface, not by chronological commit — the preview-test-fix loop produced several coord-tuning commits per scene that are consolidated here.

### Market (7.2 + 7.3)

- **Spawn moved** from bottom (y=880) to under the top archway (y=140). Member now enters facing the stalls.
- **Return-to-World button removed** from `GameMarket.tsx`. Edge-exit covers the same affordance.
- **Search-stall input removed** from `GameMarket.tsx` (UI + state + `MARKET_FILTER_EVENT` emit effect). The scene's `applyFilter` listener was left dormant; harmless cleanup opportunity.
- **Exit is ENTER-gated** at the top-edge archway (route `/world?from=market`). Walking into the top band shows `Press ENTER to return to the Square`; only ENTER navigates.
- **Archway-only span** (`span: { min: 500, max: 1036 }`) on the exit edge so walking the full top wall doesn't fire — only the archway does. Required extending `EdgeTriggerConfig` with an optional `span` field (see below).
- **StallView enrol persistence (M6)**: lifted session-local `locallyEnrolledIds` from `StallView` up to `GameMarket`, merged with server `stall.enrolled` when constructing `activeStall`. Reopening a stall after enrolling in the same session now shows "Open in Academy" instead of Enrol. Removed the redundant "you're enrolled" banner (footer swap is the confirmation). `StallView` exposes an `onEnrolled(courseId)` callback.

### Square

- **East edge prompt confined to the Tavern bridge** via `span: { min: 1050, max: 1500 }` on the right edge. Prompt only fires when the member is on the bridge, not anywhere along the right wall.
- **Return-spawn continuity** — new `SQUARE_RETURN_SPAWNS` map + new `SQUARE_SPAWN_OVERRIDE_REGISTRY_KEY`. `GameSquare` reads `?from=<origin>` from the URL (`market`, `academy`, `tavern`, `coworking`), looks up the matching bridge-spawn, and writes it to the registry. `SquareScene.createLocalAvatar` prefers the override over `squareSpritesConfig.avatar.spawnPixel`. All four sub-scene return edges now emit `?from=<origin>` (`/world?from=market` etc.).
  - market → south bridge `(1254, 2250)`
  - academy → north gate `(1254, 260)`
  - tavern → east gate `(2250, 1254)`
  - coworking → west bridge `(260, 1254)`
  - Each spawn sits inside the Square's 300 px ENTER-gated trigger band — member arrives and immediately sees "Press ENTER to visit X" for the door they just used; not auto-navigated because the triggers are ENTER-gated (7.0 step 4).

### Tavern interior (7.2)

- **Spawn moved to the archway** at `(768, 960)`. Member lands at the exit door, sees `Press ENTER to leave the Tavern` immediately.
- **`↓ Exit ↓` in-world text removed** along with its pulsing tween.
- **Exit re-implemented via `createEnterPromptManager`** with a single EntryTrigger built from `TAVERN_EXIT_ARCHWAY`. Replaces the `checkArchwayExit` auto-fire with ENTER gating. `exitReturnRoute` + `exitFired` fields removed; the manager owns both.
- **`LEAVE_BUILDING` still fires before the camera fade** — plumbed through the new `onFire` callback on `createEnterPromptManager` so pre-navigate signals keep their ordering.

### Tavern outside (7.1 + 7.2)

- **Door triggers moved to actual door positions**, reading from a dev grid overlay the user had me enable temporarily.
  - Tavern A (Three Ravens, blue top): centre `(1100, 600)`, radius `180`.
  - Tavern B (Iron Chalice, red middle): centre `(1250, 1350)`, radius `140`.
  - Tavern C (Sleeping Hollow, green bottom): centre `(1200, 2200)`, radius `180`.
  - Radii tuned bigger for A + C than B per user after preview testing ("increase size to the right").
- **`TAVERN_OUTSIDE_DOOR_SPAWNS` matches each trigger centre** exactly — exit from any tavern drops the member AT the door they came from (continuity).
- **Return edge carries `?from=tavern`** so the Square spawns the member at the east gate on return.

### Academy (7.2)

- **`← Return to World` button removed** from `GameAcademy.tsx`.
- **ENTER-gated archway exit added**: `ACADEMY_EXIT_ARCHWAY` at `(768, 960)` radius `120` with label `Press ENTER to leave the Academy`, route `/academy-outside`. Wired via `createEnterPromptManager` alongside the existing jump binding. `createJumpBinding` + `useCallback` import cleanup in `GameAcademy.tsx`.
- Academy-outside's bottom-edge return already carries `?from=academy` (shipped with the continuity pass), so exiting all the way back lands on the Square's north gate.

### Shared plumbing added this pass

- **`EdgeTriggerConfig.span`** — optional `{ min, max }` on any edge to restrict firing to a range along the edge's length. Covers archway/bridge confinement on Market (top) and Square (right — Tavern bridge). Preserves full-edge default for every other edge.
- **`EnterPromptFiredCallback`** — optional third arg to `createEnterPromptManager`. Fires synchronously before camera fade, used by Tavern for `LEAVE_BUILDING`.
- **`applyFillZoom` extended to `OutdoorSceneBase`** — all three outdoor islands (tavern-outside, academy-outside, coworking-outside) now auto-fit the viewport + re-fit on window resize, matching the interior + square behaviour.
- **`scenes/shared/debug-grid.ts`** — temporary dev grid helper used to lock tavern-outside door coords, then stripped. Still available in git history (commits `dcab0d9` and `75e1579`) for future layout passes.

### Verification

- **Typecheck:** clean across every commit in this pass.
- **Vitest:** 191 passed · 23 skipped · 0 failed (stable throughout).
- **Manual:** iterated on the Vercel preview after every commit; user walked the flows and called out offsets / coord-reads. Each coord-tuning commit was a targeted fix for a specific screenshot.

### Scope guardrail

Entire pass was client-side TypeScript in `apps/web`. No migrations, no RLS changes, no new server actions. The only non-TS file touched was `phase-07_status.md` (this file, now).

### Items carried forward to follow-up sub-phases

- **Square occupancy UI polish (S4)** — got a font bump via the 7.0 crisp-text pass; full visual polish (vellum chip / Caveat marginalia) is still on the list.
- **Academy progress + tick reliability (AC3 / AC6)** — sub-phase 7.4 not started.
- **Market StallView diegetic restyle (M7)** — sub-phase 7.3 step 2 not started.
- **Bridge-only spans on the Square's top / bottom / left edges** — only east is confined so far. User has opted for per-side nudging rather than bulk span add.
- Academy-outside default spawn on return from interior — currently the scene's default; could add a door-adjacent override.
- Dev grid stripped from all scenes; restore from git history if more coord tuning is needed.

---

## 2026-04-24 — coworking island shipped on a follow-up branch

Work continued on `phase-07.1_coworking-outside-layout` (off the phase-07.0_gameplay-polish merge). Closes CW1 / CW2 / CW3 / S2 from the original punch list, plus one new shared-plumbing add.

### Coworking outside

- **Spawn y tuned twice.** 1121 → 1171 (+50, user "move down by 50") → 1121 (user "lower y by 50" interpreted literally, turned out to be the wrong direction) → **1221** (final; +50 from the intended 1171, 100 south of original).
- **Four tents locked with 200×200 square zones** at user-clicked coords. `tent-2` removed entirely per user; building IDs stay `1/3/4/5` so existing `?b=tent-N` URLs keep working.
  - `tent-1` (900, 764) — halfWidth=100, halfHeight=100
  - `tent-3` (674, 1472) — same
  - `tent-4` (1690, 820) — same
  - `tent-5` (1718, 1604) — same
- **`COWORKING_OUTSIDE_DOOR_SPAWNS`** map added (mirrors `TAVERN_OUTSIDE_DOOR_SPAWNS`). `GameOutdoor.tsx` now handles both variants — `?from=<tentId>` on `/coworking` drops the member at that tent's door on re-entry.

### Coworking interior (tent)

- **Exit ENTER-gated** — `COWORKING_INSIDE_RETURN_EDGE.bottom` gains `promptLabel: 'Press ENTER to exit the Tent'`. Walk-onto → ENTER-gated, matching every other exit.
- **Return route carries `?from=<tentId>`** — rebuilt at runtime in `CoworkingInsideScene.create()` from the `COWORKING_BUILDING_ID_REGISTRY_KEY` registry value. Continuity: enter a tent → exit → spawn at the same tent door outside.
- **`← Leave tent` React button removed** from `GameCoworkingInside.tsx`. The in-scene ENTER prompt is the only exit affordance now. `LEAVE_BUILDING` moved into the edge-trigger's new `onFire` callback so the Colyseus room-leave still precedes the fade.
- **`enterKey` field + ENTER capture** added in `wireKeyboardInput`; `JustDown` state passed to `edgeTriggers.update()`.

### Shared plumbing (this pass)

- **`EntryTrigger.halfWidth` + `halfHeight`** — when both are set, `findNearestActiveTrigger` uses an axis-aligned rectangular containment check instead of the circular `radius` check. `radius` stays as fallback + Euclidean tiebreaker. Used exclusively by the 4 coworking tents for now.
- **`debug-grid.ts` (temporary, twice now)** — restored with an added `clickToReveal` mode that drops a yellow crosshair + `(x, y)` label at any clicked world coord and console-logs the same. Used to lock tavern-outside door coords (screenshot pass 1) then coworking tent coords (screenshot pass 2), then deleted again. Git history keeps it for the next layout pass.

### Verification

- **Typecheck:** clean.
- **Vitest:** 191 passed · 23 skipped · 0 failed (stable across all coworking commits).
- **Coworking test update:** `configs.test.ts` now asserts 4 entries + ids `['tent-1','tent-3','tent-4','tent-5']` instead of the previous 5.
- **Manual verify:** iterated live on Vercel preview of the branch. User confirmed 4 tent prompts fire inside their 200×200 squares, spawn-at-door on exit works, no `← Leave tent` button, ENTER exit at tent bottom works.

### Items now cleared (were in the "carried forward" list above)

- **Coworking scenes (S2 / CW1 / CW2 / CW3)** — all addressed.

### Still carried forward

- Square occupancy UI polish (S4) — visual pass.
- Academy progress + tick reliability (AC3 / AC6).
- Market StallView diegetic restyle (M7).
- Square top / bottom / left edge spans.
- Coworking-outside occupancy UI polish + avatar-size tuning inside tent (if the user surfaces either after they play the flow).

---

## 2026-04-24 — CI hotfix after merge (#13)

CI turned red on every commit after `#12` merged (and retroactively on `#11`'s check). Two small issues missed because local verification was only `tsc --noEmit` + `vitest run`, not the full `format:check` + `lint` + `typecheck` + `test` the GitHub Actions workflow runs.

### What broke

1. **Prettier** — six Phase-7 scene files were hand-edited without a `prettier --write` pass: `scenes/academy/AcademyScene.ts`, `coworking-inside/CoworkingInsideScene.ts`, `market/MarketScene.ts`, `shared/edge-triggers.ts`, `square/SquareScene.ts`, `tavern/TavernScene.ts`. CI's `format:check` stage failed on commit `#1d87d92` and every commit on the coworking branch too.
2. **ESLint `no-unused-vars`** — `GameCoworkingInside.tsx` kept `import { MSG } from '@arcadia/shared'` after the Leave-tent React handler (the only MSG consumer) was removed in the coworking pass. TypeScript's strict mode doesn't flag unused imports; ESLint does. CI's `lint` stage failed.

### Fix shipped

- Hotfix branch `phase-08.hotfix_prettier` off main. One commit (`8ccab8c`): prettier reformat of the six files + drop the `MSG` import. No behavioural change.
- PR `#13` merged to main as `c552e60`; CI ran green.
- `phase-08_ui-wireup` rebased on the updated main (force-pushed) so its future PR opens clean.

### Process note (for future turns)

Local verification for Phase-7 was `typecheck + vitest`. Missing: `format:check` (prettier) + `lint` (ESLint). The workflow runs 4 stages; pushing with only 2 verified means 50% of the gates are evaluated in the wrong environment (CI, post-push). Going forward the pre-push check is all four stages — added to root `CLAUDE.md` so it's a first-class rule, not a foot-gun.
