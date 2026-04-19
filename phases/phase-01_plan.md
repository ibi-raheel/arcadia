## Phase 1 Plan: World + avatar picker

**Source:** `/docs/mvp/phase-plan.md` §Phase 1 (Weeks 3–5) and `/docs/mvp/tad.md` §3.1, §3.3, §4.1–§4.3. This file is the executable plan; the MVP doc is the contract.

**Goal:** One authenticated member can sign up, get routed to `/onboarding/avatar`, pick an avatar (upserted to `memberships.avatar_id`), load `/world`, walk around an isometric tilemap with WASD / arrow keys / click-to-move, collide with building walls and world edges, step into a building entrance zone, fade-to-black transition into the building page shell (`/tavern`, `/academy`, or `/market`), and walk back out — all sustained at 60 FPS on the Phase 0 proxy target (Chrome DevTools 6× CPU throttle).

No multiplayer. No chat. No course content. No XP. Those belong to Phases 2–5.

---

### Phase 0 carryovers (must clear before Phase 1 Week 3 starts)

1. **FPS spike measurement** on the Mac Mini M4 under 6× CPU throttle — `planning/architecture/rendering.md` §4 protocol, §5 log table. If the spike fails, Phase 1 Week 3 cannot begin (the rendering approach gets re-escalated).
2. ~~Art delivery for Group 1 + Group 2~~ — **no longer blocking Phase 1** (user decision 2026-04-18). Phase 1 uses Phaser `Rectangle`-primitive placeholders for avatars + buildings, plus a trivial hand-authored placeholder tileset PNG (grass + path) for the tilemap ground. Real art swaps in as a post-Phase-1 polish step — a file-level replacement with no scene-code changes. See Locked decisions → "Placeholder visuals."
3. **Google OAuth** (optional; PRD §4.1 accepts email/password). Not blocking.

---

### Locked decisions (Phase 1)

| Decision | Value | Source |
|---|---|---|
| Tile size | 64 × 32 px, 2:1 ratio | TAD §4.1 |
| Tilemap format | Tiled `.tmj`, loaded via Phaser's tilemap loader | TAD §4.1 |
| World dimensions | **30 × 30 tiles** outdoor map (≈ 1920 × 960 logical px — camera clamps to these bounds) | chosen for Phase 1; large enough for all three buildings + walkways without making the map feel empty |
| Building count / names | 3 — Tavern, Academy, Market (cosmetic aliases per REFERENCES.md) | PRD / TAD |
| Building entrance zones | Invisible Phaser `Zone` / `Rectangle` overlap rectangles, one per building, positioned at the front-door tile | TAD §4.1 |
| Y-sort rule | Every dynamic object sorted by `(y + height/2)` each frame | TAD §4.1 |
| Phaser mount | `dynamic(..., { ssr: false })` wrapper over `GameWorld` component | TAD §3.2 |
| Local-avatar input rate | Captured per-frame; movement happens client-side only in Phase 1 (Colyseus `MOVE` messages land in Phase 2) | TAD §4.3 derivative |
| Collision | Phaser Arcade Physics bodies — avatar body vs. building wall bodies + world-bounds wall | phase-plan §Phase 1 Week 4 |
| Click-to-move | Phaser pointer input sets a target point; avatar tweens toward it, halted by collision | phase-plan §Phase 1 Week 4 |
| Idle trigger | **No delay.** Flip to idle state the instant `isMoving === false`; flip back to walk the instant any input registers. With Phase 1 Rectangle placeholders there is no visual swap (rectangles render identically walk vs idle), but the `isMoving` flag is still tracked because Colyseus `AvatarState.isMoving` (Phase 2) reads it. Real atlases swap in walk/idle frame sets against the same flag. | user decision 2026-04-18 (overrides phase-plan §Phase 1 Week 4 which specified a 2s delay) |
| Placeholder visuals | All Phase 1 in-game graphics are **Phaser `Rectangle` primitives** (avatars, building footprints) plus a **trivial hand-authored placeholder tileset PNG** for the tilemap ground (2 tiles — grass + path). No sprite sheets, no atlases. Avatar colors map stably to `avatar-01`…`avatar-08` keys, defined in `scenes/world/sprites.config.ts`. When real art lands, the swap is file-level: `Rectangle` → `Sprite(atlasKey)` for avatars, placeholder.png → real tileset images for tiles. Scene code unchanged. | user decision 2026-04-18 |
| Building-entry transition | Phaser camera fade-to-black → Next.js route to `/tavern` / `/academy` / `/market` → unmount canvas | phase-plan §Phase 1 Week 5 |
| Return transition | Building page has a "Return to World" button → route back to `/world` → Phaser remounts → avatar spawns at that building's **exit tile** (one tile on the walkable side of the entrance — Tavern + Academy entrances face south so exit is south; Market's entrance faces north so its exit is north). Coords in `scenes/world/sprites.config.ts`. | phase-plan §Phase 1 Week 5, amended Step 6 2026-04-18 |
| Avatar-picker route | `/onboarding/avatar` — CSR React page (TAD §3.1), auth-gated (already in middleware allowlist? No — it must be authed-only; update `middleware.ts` if needed) | TAD §3.1 |
| Entry gate | Middleware check: if authed user's `memberships.avatar_id IS NULL` on any request under `/world` or `/tavern`, redirect to `/onboarding/avatar`. Implemented in `apps/web/middleware.ts` (extend existing Step 16 middleware; do not introduce a second middleware file) | TAD §3.3 |
| Entry-gate DB read | Server-side Supabase client fetches `memberships.avatar_id` keyed by `auth.uid()`. One read per protected request is acceptable for MVP traffic | derived |
| Avatar ID format | Stable string keys `avatar-01`…`avatar-08` mapping to the 8 atlases; stored in `memberships.avatar_id` as text | consistent with existing schema's `avatar_id TEXT` column (TAD §6.1, line 221) |
| Game folder layout | `apps/web/components/game/` owns all Phaser code. Subfolders: `scenes/boot/`, `scenes/world/`, `scenes/shared/`. Every scene folder owns its scene class, `*.config.ts` files, `__tests__/`, and a `CLAUDE.md`. Art stays central in `public/{avatars,tilesets,maps}/`. | user decision 2026-04-18 |
| Config format | **Typed TS modules** (`as const`-exported objects) in `camera.config.ts`, `sprites.config.ts`, `layers.config.ts` next to each scene. Scene classes import configs and **never hardcode tweakable values** (zoom, lerp, deadzone, spawn tile, body offset, entrance/exit coords, y-sort layer order, idle timeout). Runtime behaviours (fade/shake) stay in scene code. | user decision 2026-04-18 |
| Per-folder CLAUDE.md | Game-level `components/game/CLAUDE.md` documents the pattern + future-scene expansion path. Per-scene `CLAUDE.md` ≤20 lines: purpose, config knobs, art it loads, sync relationships (Phase 2+). Enables scoping `claude` to a single scene folder. | user decision 2026-04-18 |
| Future-scene expansion path (documented, **not built in Phase 1**) | `scenes/tavern/` lands Phase 2 Week 7 (interior tilemap, Colyseus sync). Academy and Market have **no Phaser scene ever** — they are pure React pages (`app/academy`, `app/market`) per TAD §4.2. Any new scene follows the same folder convention. Game-level `CLAUDE.md` records this so future phases land the right shape without re-deciding. | TAD §4.2 + user decision 2026-04-18 |

---

### Steps

**Week 3 — Folder structure, tilemap, scene, avatar picker**

1. **Game folder layout + per-scene config pattern.** Create `apps/web/components/game/` with:
   - `CLAUDE.md` — documents the pattern: TS `*.config.ts` per scene, scene classes import configs, no hardcoded tweakable values. Includes the future-scene expansion path (Tavern scene lands Phase 2 Week 7; Academy/Market stay React-only).
   - `GameWorld.tsx` — React mount, dynamic-imported with `{ ssr: false }` per TAD §3.2.
   - `scenes/shared/` — `iso-math.ts` (screen↔tile helpers), cross-scene `types.ts`, `CLAUDE.md` (≤20 lines).
   - `scenes/boot/` — `BootScene.ts`, `CLAUDE.md`. No configs in this folder (preload only, no camera/sprites).
   - `scenes/world/` — `WorldScene.ts`, `camera.config.ts`, `sprites.config.ts`, `layers.config.ts`, `__tests__/`, `CLAUDE.md`.
   - Commit the empty structure first so downstream steps land into named homes. Write the game-level `CLAUDE.md` carefully — it's the anchor that makes per-folder `claude` sessions productive.
2. **Remove `/spike` route and its middleware allowlist entry.** Phase 0 shipped `/spike` as an unauth'd demo; it's superseded by `/world`. Delete `app/spike/page.tsx` and its scene file, and drop `/spike` from `middleware.ts` public allowlist. Do this before building `/world` so there's no ambiguity between the two during Phase 1.
3. **World tilemap design.** Author `apps/web/public/maps/world.tmj` in Tiled: 30×30 grid, 64×32 iso tiles. Three layers: `ground` (grass / paths / decorative), `collision` (walls of the three building footprints + map-edge ring), `overlay` (decorative props rendered above avatars via y-sort). Place three building footprints clearly separated, with a walkable path network connecting them and a spawn tile at approximate map centre. Commit the `.tmj` and reference images to the repo.
4. **Placeholder assets.** Create `apps/web/public/tilesets/placeholder.png` — a tiny image (e.g. 128×32 px, 2 × 64×32 tiles side by side) with a grass tile (green) and a path tile (tan). `world.tmj` (Step 3) references this tileset. Avatars + buildings do **not** get image assets — they render as Phaser `Rectangle` primitives at runtime, colored per `scenes/world/sprites.config.ts`. `scripts/verify-atlases.ts` is **deferred** to the polish step that lands real atlases; there are no atlases to verify in Phase 1.
5. **BootScene.** `scenes/boot/BootScene.ts`: preload the placeholder tileset PNG + the `world.tmj` JSON; emit progress events wired to the React loading screen (Step 20); on complete, hand off to WorldScene. No avatar atlases to preload in Phase 1 (placeholders are runtime Rectangles). No camera or sprite logic lives here.
6. **Scene config files for World.** Populate `scenes/world/*.config.ts`:
   - `camera.config.ts` — `{ zoom, followLerp, deadzone, bounds, fadeInMs, fadeOutMs }` all as-const. Bounds come from `world.tmj` dimensions (×tile size).
   - `sprites.config.ts` — `{ avatar: { spawnTile, scale, bodyOffset, walkSpeed }, avatarColors: { 'avatar-01': 0xef4444, 'avatar-02': 0x3b82f6, … (8 stable hex colors for Phase 1 Rectangle placeholders) }, buildings: { tavern: { entranceTile, exitTile, footprintRect, fillColor }, academy: {…}, market: {…} } }`. **No `idleTimeoutMs` key** — idle is a zero-delay state toggle (see Step 16).
   - `layers.config.ts` — y-sort group order constants; overlay layer names from the tilemap.
   - One Vitest per config that asserts structural shape (keys present, types correct). These tests double as a spec — future edits that drop a field fail CI before they ship.
7. **WorldScene skeleton.** `scenes/world/WorldScene.ts` — imports the three configs above and uses them to: instantiate the tilemap (bounds from `camera.config`), create collision bodies from the `collision` layer, set camera follow + lerp + deadzone + bounds from `camera.config`. **No magic numbers in the scene class.** If you catch yourself typing a literal for a tweakable value, move it to a config first.
8. **Y-sort implementation.** Dedicated y-sort group or manual `scene.children.sort()` keyed on `(y + height/2)` every frame. Group order and any ordering constants come from `layers.config.ts`. Unit test: given three sprites at different y, assert depth order after a `sort()` call.
9. **Building placeholders + entrance zones.** For each of the three buildings: (a) render a Phaser `Rectangle` at its footprint — position + dimensions from `sprites.config.buildings.<name>.footprintRect`, filled with `fillColor` — **visual only; collision still comes from the tilemap `collision` layer per Step 15**; (b) place an invisible `Phaser.GameObjects.Zone` at `buildings.<name>.entranceTile`, carrying a string tag: `'tavern' | 'academy' | 'market'`. No logic on the zone yet — Step 17 wires the overlap callback. When real art arrives, the `Rectangle` → `Sprite` swap uses the 3 building-facade assets per the art spec; no structural change.
10. **`/onboarding/avatar` page.** New route `apps/web/app/onboarding/avatar/page.tsx` — CSR React component. Renders a 4×2 grid of 8 avatar preview thumbnails (from the art-spec per-character thumbnail asset). Clicking a thumbnail triggers a server action (or `/api/onboarding/avatar` POST route) that calls `supabase.from('memberships').update({ avatar_id }).eq('member_id', auth.uid())`, then redirects to `/world`. Loading + error states visible.
11. **Entry-gate middleware.** Extend `apps/web/middleware.ts` (from Phase 0 Step 16): after the existing session refresh, for any authed request under `/world` or `/tavern`, fetch the user's `memberships.avatar_id`; if null, redirect to `/onboarding/avatar`. For any authed request to `/onboarding/avatar` **where `avatar_id` is already set**, redirect to `/world` (so returning members don't sit on the picker). Add to the existing Vitest middleware suite (create one if absent) covering: null → redirect to picker; set → allow through; already-picked user hitting picker → redirect to `/world`.

**Week 4 — Avatar movement**

12. **Local-avatar placeholder.** On `WorldScene.create()`, read the authed member's `memberships.avatar_id`, instantiate a Phaser `Rectangle` (dimensions from `sprites.config.avatar.scale` — target roughly 32×48 to match intended real-sprite bounds) tinted with `sprites.config.avatarColors[avatar_id]`. Position it at `sprites.config.avatar.spawnTile`, converted to world-space via `scenes/shared/iso-math.ts`. Wrap with an Arcade Physics body sized per `sprites.config.avatar.bodyOffset`. Display-name text object above the rectangle (clipped to 16 chars, white with dark outline per TAD §4.3). Level badge below name rendered as Level 1 for all users (real level sync is Phase 5). When real atlases arrive, this step becomes a `Rectangle` → `Sprite(atlasKey)` swap; no other changes.
13. **Keyboard movement.** WASD + arrow keys wired via Phaser `InputPlugin`. Normalised diagonal speed so `↑+→` doesn't move 1.41× faster than a cardinal press. Direction state (`'up' | 'down' | 'left' | 'right'`) is **tracked on the avatar controller but has no visual effect with Rectangle placeholders** — it wires through to Colyseus `AvatarState.direction` in Phase 2 for remote-avatar rendering, and will drive the sprite-sheet frame row when real atlases arrive. Base speed is `sprites.config.avatar.walkSpeed`.
14. **Click-to-move.** Phaser pointer-down on the scene sets a target world-space point. Per-frame tween moves the avatar toward the target at the same base speed as keyboard movement; arrives when within 2 px. Any keyboard press cancels the tween. Collision halts the tween where it would otherwise push into a wall.
15. **Collision.** Enable Arcade Physics. Build static bodies from the `collision` tilemap layer (every non-zero tile becomes a solid). Add a world-bounds collider ring. Avatar is a dynamic body with a body rectangle sized to the avatar's feet — dimensions from `sprites.config.avatar.bodyOffset`, not hardcoded. Manual test: avatar cannot clip through any building wall, cannot leave world bounds, cannot pass diagonally through corners.
16. **Movement-state machine (idle ↔ walk, zero delay).** The avatar controller tracks an `isMoving` boolean derived from current velocity: `true` when any input is producing movement, `false` otherwise. **Transitions are instant — no timer, no delay.** Movement stops → `isMoving = false` this frame; any input → `isMoving = true` this frame. With Rectangle placeholders no visual swap happens — the flag is still tracked because Phase 2 Colyseus `AvatarState.isMoving` reads it. When real atlases arrive, binding walk/idle frame sets to this flag is a one-line change (no state-machine rewrite).

**Week 5 — Building navigation**

17. **Building-entrance overlap handler.** Arcade Physics overlap between the avatar body and each of the three entrance zones. On overlap: set an `isTransitioning` flag (ignore further overlap until cleared), trigger `camera.fadeOut(camera.config.fadeOutMs, 0, 0, 0)`; on `'camerafadeoutcomplete'`, call `router.push('/tavern' | '/academy' | '/market')` via a callback passed into the scene from the React mount.
18. **Building page shells.** Three routes: `app/tavern/page.tsx`, `app/academy/page.tsx`, `app/market/page.tsx`. Each renders a page shell (header with building name, "Return to World" button bottom-left, empty content area marked "Coming in Phase 2/3/4"). All three auth-gated via existing middleware. **No Phaser scene** for any of these in Phase 1 — Tavern gets its scene in Phase 2 Week 7; Academy/Market stay React-only per TAD §4.2.
19. **Return-to-world flow.** The "Return to World" button routes to `/world?from=tavern` (or `academy` / `market`). `WorldScene` reads the query param on mount and spawns the avatar at `sprites.config.buildings.<name>.exitTile`. Camera fade-in on scene start using `camera.config.fadeInMs`.
20. **World loading screen.** React loading screen shown while Phaser preloads (covers the gap between `dynamic()` resolution and WorldScene boot). Progress bar wired to `BootScene`'s `LoaderPlugin` `progress` event; displays the Realm name (`Arcadia — mvp-realm` for MVP). Same loading screen reused for the building → world transition's brief remount.
21. **Final polish pass.** Sweep for layering bugs (avatar rendering behind foreground props it should be in front of, and vice versa), collision gaps at map edges, and spawn-tile positioning per entry point. Verify every tweakable value is in a config file (no literals snuck back into the scene). Fix anything caught.

---

### Test criteria (Phase 1 exit)

All must pass before Phase 2 starts. The exit gate is the **end-to-end run** in the first row; everything else is the checklist of what must be true for that run to succeed.

- **End-to-end demo run on deployed Vercel URL:** a newly-registered member is redirected to `/onboarding/avatar`, picks an avatar, lands on `/world`, walks to the Tavern entrance with WASD, enters it, sees the Tavern shell, clicks Return to World, walks back out, enters Academy (using click-to-move this time), returns, enters Market, returns. Screen capture saved to `planning/architecture/rendering.md` §6 (new subsection).
- ~~**60 FPS measurement** on Chrome DevTools 6× CPU throttle.~~ **Deferred to Phase 5 polish or whichever phase lands the real-art redesign (user decision 2026-04-19).** Placeholder visuals make the measurement unrepresentative; re-measure against real art.
- **Entry gate:** a newly-registered member whose `memberships.avatar_id IS NULL` visiting `/world` directly is redirected to `/onboarding/avatar`. Covered by the Vitest middleware suite + one manual check on deployed Vercel.
- **Avatar picker:** selecting an avatar upserts `memberships.avatar_id` (verified via Supabase MCP read-only query) and redirects to `/world`. Returning to `/onboarding/avatar` after picking redirects back to `/world`.
- **Keyboard + click-to-move:** both input methods move the avatar at the same base speed. Diagonal keyboard movement is not faster than cardinal. Click target is cancellable by any key press.
- **Collision:** avatar cannot clip through any building wall, cannot exit world bounds, cannot diagonal-slip through corners. Manual test across all three buildings + all four world edges.
- **Y-sort:** the avatar correctly renders behind foreground props when its `y + height/2 <` prop's, and in front otherwise. Tested by walking the avatar north past a tree sprite and south past the same.
- **Building transitions:** entering any of the three buildings fades to black within 300 ms, routes to the correct shell, and Return-to-World lands the avatar back at that building's exit tile with camera fade-in.
- **Movement-state machine (zero delay):** `isMoving` flips to `false` the same frame movement stops; flips to `true` the same frame input registers. Validated via a Vitest unit test on the avatar controller state machine. Phase 1 Rectangle placeholders render identically walk vs idle; visual walk/idle validation is deferred to the real-art swap.
- **Placeholder visuals:** at runtime, all 8 avatar placeholders are visually distinguishable by color; 3 buildings are visually distinguishable by position + tint; tilemap ground reads as grass/path. No image asset is required for avatars or buildings — they are pure Rectangle primitives.
- **Config-driven scene:** grep `scenes/world/WorldScene.ts` for numeric literals used as tweakable values (camera zoom, lerp, spawn coordinates, idle timeout, walk speed, body offsets) — there should be none. Every such value lives in `scenes/world/*.config.ts`. Changing a config value and re-running must change in-game behaviour without editing the scene class.
- **Per-folder CLAUDE.md scopes work correctly:** launching `claude` with CWD `apps/web/components/game/scenes/world/` picks up the per-scene CLAUDE.md and can answer "what does this scene do and what can I tweak" from local context alone (manual smoke test).
- **CI:** all existing Phase 0 checks still green; new tests added and passing — y-sort ordering, middleware avatar-gate logic, config-shape assertions (Step 6).

---

### Risks / unknowns

| # | Item | Action |
|---|---|---|
| 1 | **Tilemap design work (Step 3)** is a non-trivial calendar item — authoring a 30×30 iso map in Tiled with three coherent building footprints + pathways takes hours, not minutes. Mitigation: author a minimal viable map first (flat grass + three rectangular footprints + straight paths), iterate on decoration in Week 5's polish pass. |
| 2 | **Art delivery is no longer Phase-1-blocking** (user decision 2026-04-18). Phase 1 ships on Rectangle placeholders + a trivial tileset PNG. New risk: when real art lands (post-Phase-1), the swap reveals visual bugs — y-sort against taller sprites, body-offset mismatch against new sprite anchors, atlas-frame-size mismatch against placeholder Rectangle dimensions. Mitigation: keep placeholder Rectangle dimensions close to the intended real sprite bounds (32×48 for avatars per art spec); write `sprites.config.ts` so body offsets are expressed relative to sprite dimensions, not as absolute pixel literals. |
| 3 | **Entry-gate DB read on every `/world` and `/tavern` request** is a per-request Supabase call from middleware. Acceptable for MVP traffic; flag for revisit if P99 request latency degrades. Alternative: cache `avatar_id` in a signed session cookie; defer unless measured as a problem. |
| 4 | **Phaser middleware + Next.js App Router interactions** — dynamically imported Phaser doesn't rehydrate cleanly across same-tab client-side navigations if not unmounted explicitly. Mitigation: ensure `GameWorld` component has a robust `useEffect` cleanup that calls `game.destroy(true)` on unmount. Manually verify remount behaviour on every Return-to-World. |
| 5 | **Collision geometry from tilemap layer** vs **decorative foreground props** — the `collision` layer should not include purely decorative overlay sprites. Design discipline: only walkable-blockers go in `collision`, decoration goes in `overlay`. Document this in `planning/architecture/rendering.md`. |
| 6 | **60 FPS NFR validation is now two-stage.** Phase 1 validates only the Rectangle-placeholder frame budget — easier than final production. Real-art 60 FPS measurement moves to the first phase that ships real sprites (Phase 5 polish candidate, or earlier if art lands). If real art pushes the frame budget at that point: reduce overlay-layer sprite count → cull off-screen tiles → reduce map to 24×24. Phase 1 60 FPS is **necessary but not sufficient** for PRD §5 NFR compliance. Relatedly, the Phase 0 FPS spike (still user-pending as of 2026-04-18) is now less load-bearing — the real validation point shifted with the placeholder decision. |
| 7 | **Reference mid-range laptop** still not available for true PRD NFR validation (Phase 0 risk carryover). Not blocking Phase 1 exit; blocking pre-Phase-5-Loom. |
| 8 | **Config leak vs premature sharing.** Discipline: scene-specific values live in that scene's `*.config.ts`; values used by two or more scenes live in `scenes/shared/`. Don't force-share prematurely — if Tavern (Phase 2) ends up with its own walk-speed, that's fine. Revisit when a second scene lands. |
| 9 | **Phaser Editor MCP + Phaser 4 upgrade.** **Evaluated and declined 2026-04-18.** MCP is a Phaser Editor v5 desktop-app driver (edits the editor's proprietary scene format, not our TS source) — wrong shape for hand-coded TS scenes. Phaser 4.0.0 went GA 2026-04-10; too new to swap into an in-progress MVP. ADR 0001 Phaser 3.88 lock stands. Revisit both after Phase 1 ships. |

---

### Out of scope for Phase 1

Explicitly deferred to later phases: any Colyseus wiring (room join, `MOVE` messages, remote avatars), Tavern chat UI, emoji reactions, course content, Academy video player, Market grid, creator dashboard, XP / level awards, level-up toasts, member-count badges on building entrances (Phase 2), Realtime subscriptions, CF Stream integration.

Phase 1 is: one member, one world, one avatar, three building shells. Nothing else.

---

### Execution discipline (from CLAUDE.md and phases/CONTEXT.md)

1. This plan is stopped here pending user confirmation before any Step 1 work begins.
2. Once approved, open `phase-01_status.md` and log progress chronologically (newest at top), same format as `phase-00_status.md`.
3. Test each step's exit criteria before moving on. Do not batch verification.
4. Run `/security-review` before any merge that touches the auth-gate middleware, `/api/onboarding/avatar`, or RLS-touching queries.
5. Flag scope creep or architectural concerns the moment they appear — do not paper over.
