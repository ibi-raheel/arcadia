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
