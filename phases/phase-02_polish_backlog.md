# Phase 2 — Polish Backlog

Deferred items from Phase 2. Each is self-contained and can be picked up between phases or as filler without blocking Phase 3. Order below is my rough sense of impact × effort — pick any.

## 1. Tavern colliders

**Why:** Avatar currently walks over the bar counter, tables, and stools because the tavern is image-backed (`public/tavern-interior.png`) with no collision data. Low-stakes visually, but obvious once you notice.

**Scope:**
- User marks collider rectangles on the 1376×768 tavern image (screenshot annotation or just coordinates).
- Add a `colliders: ReadonlyArray<PixelRect>` entry to `scenes/tavern/layers.config.ts`.
- In `TavernScene.create()`, build static Arcade bodies for each rect and register them as an Arcade `StaticGroup`; add a collider between `localAvatar.body` and the group.
- Unit test: config-shape assertion that colliders is a non-empty array of four-number rects.

**Effort:** ~1 hr once coordinates are in hand. No server changes.

## 2. Tavern + Market building-entry art

**Why:** Academy sprite was placed at world tile (12, 6) via `decor`-layer gid 364; Tavern and Market entrances still use the Phase-1 invisible overlap zones. Visually inconsistent.

**Scope (per building):**
- User authors / sources a building sprite (same pipeline as the Academy sprite).
- Add tileset entry to `world.tmj` (or a standalone y-sorted Sprite placed at the entrance tile — matches how Academy was done).
- Register in `scenes/boot/asset-manifest.ts` if a new tileset file.
- Confirm the entrance overlap zone still fires at the correct tile after art lands.

**Effort:** ~30 min per building once art exists. Mostly an art task.

## 3. Leaderboard display names

**Why:** Leaderboard pulls `memberships.xp` but display-name rendering is hooked to whatever `memberships.display_name` currently holds, which may be null for older seed rows → shows "Player" for everyone. Worth auditing.

**Scope:**
- Audit `apps/web/components/tavern/LeaderboardPanel.tsx` select fields.
- Confirm the `memberships` Realtime subscription fetches `display_name`.
- Add a fallback chain: `display_name → avatar canonical name (AVATAR_NAMES) → "Anonymous"`.
- Consider a small Supabase backfill for rows where `display_name IS NULL`.

**Effort:** ~45 min including a backfill migration.

## 4. Reactions UI re-add

**Why:** Backend is intact — `toggle_reaction` RPC + RLS suite tests still pass — but the UI was removed 2026-04-19. If community feedback wants emoji reactions back, the code exists in git.

**Scope:**
- Cherry-pick `ReactionPicker.tsx` from branch `phase-02-chat-polish-v2` commit `44c577a`.
- Rewire to the current speech-bubble-based chat (was bottom-bar before removal).
- Decide trigger: click bubble → picker (previous), or a separate affordance.
- Smoke test across two tabs.

**Effort:** ~2 hr because of the UX integration choice. Pure-additive, no server work.

---

## 5. Orthogonal top-down world swap — ✅ SHIPPED 2026-04-22

`/world` now renders the orthogonal town square from `public/maps/arcadia-square-v3.tmj` via `app/world-square-v3/GameWorldSquareV3.tsx`. Scene implements the seven-rule Phaser wiring pattern in ADR 0007 §"Phaser wiring" (load.spritesheet + explicit gid-firstgid frame picking + y-shift + origin(0,1) + setDepth(y)). Bridges classified by quadrant auto-wire neon-signposted portals to `/academy` (north), `/market` (east), `/tavern` (south); merchant NPC adds proximity tip bubbles.

Full shipping details in [`docs/changelog/2026-04-22_world-swap-orthogonal-square.md`](../docs/changelog/2026-04-22_world-swap-orthogonal-square.md).

**Open follow-ups** (not blocking):
- ~~Re-add Colyseus presence on `/world`~~ — **DONE 2026-04-22 evening** (image-backed swap, see [changelog](../docs/changelog/2026-04-22_image-backed-world.md)).
- ~~Per-building Colyseus sharding for tavern + coworking~~ — **DONE 2026-04-23** (PR #10 merged, see [changelog](../docs/changelog/2026-04-23_image-backed-world-complete.md)).
- ~~Wire the west bridge~~ — obsolete; image-backed world uses edge-rect triggers instead of bridge sprites.
- Delete legacy iso code: `components/game/GameWorld.tsx`, `components/game/scenes/world/**`, `public/maps/world.tmj`, `public/tilesets/world.png`. All still compile + tests pass but nothing imports them at runtime.
- Delete legacy Tiled square: `app/world-square-v3/`, `public/maps/arcadia-square-v3.tmj`, `public/tilesets-square-v3/`. Superseded by the image-backed `SquareScene` at `/world`. Safe to drop once image-backed world is stable on prod for ~a week.
- Large image sizes: the 2508×2508 / 2806×2242 PNGs are ~9 MB each. Post-merge item — either swap to the 1× variants (1254×1254) or add a build-time `squoosh` pass.
- Author collider rects across the new scenes (square, 3 outdoors, coworking-inside). All ship with `colliders: []`; activate per Phase-5 Step 15 pattern.
- Extend `/rooms/:name/count` to accept a `building` query filter so the capacity HUD can reflect the specific shard, not the whole room type.

---

**Not in this backlog** (explicitly Phase 5, per status doc):

- Real-art 60 FPS measurement — belongs with the broader polish phase.
- XP award DB triggers — leaderboard values stay 0 until Phase 5.
