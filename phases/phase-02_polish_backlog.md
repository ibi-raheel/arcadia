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

**Not in this backlog** (explicitly Phase 5, per status doc):

- Real-art 60 FPS measurement — belongs with the broader polish phase.
- XP award DB triggers — leaderboard values stay 0 until Phase 5.
