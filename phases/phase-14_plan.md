# Phase 14 Plan: Persistent Player HUD (avatar + name + XP + level)

**Goal:** A persistent in-game HUD overlay that follows the player
through every Phaser scene. Top-left: circular avatar portrait +
display name. Top-right: XP progress bar to next level + level
shield (number only, no "Lvl" text). Obscured by modals (Sage
popup, jukebox overlay, etc.) — visible the rest of the time.

**Branch:** `feature/player-hud` → PR against `main`.

## Why this scope

The world feels less rooted when there's no constant reminder of
*who* the player is and *where* they are in the level arc. Existing
overlays (HearthPill, FocusPill, PomodoroBanner) are coworking-
specific. The HUD lives one tier up — global, identity-anchored,
cheap to glance at.

Reference: user-supplied screenshot (dark navy panel, corner-cross
ornaments, horizontal divider) using Kenney's "Fantasy UI Borders"
pack (CC0).

## Sub-phases

### 14.0 — Plan + ADR + asset ingest (this commit)

- Branch `feature/player-hud` cut from `main`.
- `phases/phase-14_plan.md` (this file) + `phases/phase-14_status.md`.
- ADR 0018 (Kenney 9-slice + SVG shield rationale).
- Ingest a 4-file subset of Kenney into `apps/web/public/hud/kenney/`
  with `ATTRIBUTION.md` + license. Update `apps/web/public/CLAUDE.md`
  to register the new `hud/` category per its drift rules.

**Test:** files exist; `public/CLAUDE.md` mentions `hud/`.

### 14.1 — Shared progress helper + XP in fetchSession

- `packages/shared/src/gamification/levels.ts` — add
  `progressToNextLevel(xp: number)`. Returns
  `{ level, currentLevelXp, nextLevelXp, percent }` where
  `percent` ∈ [0, 1] (max level returns 1). Pure function; reads
  `LEVEL_THRESHOLDS`.
- Vitest cases: zero XP → percent 0, just-levelled-up → percent 0,
  halfway → ~0.5, exactly at threshold → 1 then resets, max-level
  → 1 always.
- Extend `fetchSession()` in the three game pages
  (`GameSquare`, `GameCoworkingInside`, `GameOutdoor`) to include
  `xp` in the Supabase `memberships` query. Pass it down via
  registry / props.

**Test:** vitest on the new helper; existing `fetchSession` callers
still typecheck.

### 14.2 — `PlayerHud` component

New `apps/web/components/hud/`:

- `PlayerHud.tsx` — orchestrator. Two children: `<AvatarBadge />`
  (top-left) and `<XPLevelBadge />` (top-right). Both fixed-
  positioned, z-index 70 (same layer as HearthPill / FocusPill,
  obscured by modals at 80).
- `AvatarBadge.tsx` — Kenney 9-sliced panel containing a 48×48
  circular avatar (cropped from `idle.png` frame 0 via
  `background-image` + `background-position`) and the display name
  in IM Fell English Italic.
- `XPLevelBadge.tsx` — Kenney 9-sliced panel containing the XP
  progress bar (current → next-level fill) and the SVG shield with
  the level number rendered in `--gilt` text.
- `Shield.tsx` — pure SVG shield component, `level: number` prop.
- `panel.css` — the `border-image` rules + `--hud-fill` token tied
  to the existing `--night` palette + `image-rendering: pixelated`.
- Realtime: subscribe to Supabase `memberships` UPDATE on the
  local member id; update XP / level live without a page reload.

**Test:** `panel.css` and the components compile; render-shape
test (vitest + jsdom — render `<PlayerHud xp={x} level={n}
displayName="A" avatarId="avatar-01" />`, assert shield shows
the right number, bar width matches expected percent).

### 14.3 — Mount across game pages

Mount `<PlayerHud />` as a sibling of the existing overlays in:

- `apps/web/components/game/GameSquare.tsx`
- `apps/web/components/game/GameCoworkingInside.tsx`
- `apps/web/components/game/GameOutdoor.tsx`
- `apps/web/components/game/GameTavern.tsx`

Pass `displayName`, `avatarId`, and `xp` from the same session
fetch each page already does. The Tavern, Coworking-inside, and
World scenes use Colyseus — the HUD reads the local member's data
from `state.avatars.get(room.sessionId)` if a room is connected,
falling back to the fetched session value.

**Test:** typecheck + manual browser walkthrough across each
scene; HUD must persist on scene change, get obscured by Sage /
jukebox, and update when level-up event fires.

### 14.4 — Docs

- `docs/changelog/2026-04-25_phase-14-player-hud.md` (new).
- README: extension-phase line bump (seven → eight); recent-
  activity entry; phase exit-logs row gets `· [Phase 14]`.
- `docs/mvp/phase-plan.md` banner: add the Phase 14 bullet.
- `CLAUDE.md` naming-convention bullet: extend phase range to
  `06–14`. Add a new routing-table row for the HUD.
- `phases/phase-14_status.md`: log entries for 14.0 → 14.4.

## Test criteria (phase-wide)

1. `PlayerHud` renders in `/world`, `/coworking/inside`,
   `/coworking/outside`, `/academy-outside`, `/tavern-outside`,
   `/tavern`.
2. Top-left shows the player's avatar portrait + display name.
3. Top-right shows XP bar (filled to the right ratio) + level
   shield with the number.
4. SageDialogue, JukeboxOverlay, HourglassOverlay obscure the HUD
   (z-index 80 vs 70).
5. When the user crosses a level threshold, the bar resets and
   the shield number ticks up — both within ~1 s of the Realtime
   UPDATE landing.
6. `npm run format:check`, `lint`, `typecheck`, `test` all green.
7. `next build` succeeds.

## Out of scope

- A heraldic crest beyond the basic SVG shield (brand-design pass
  later if we want richer art).
- HUD on non-Phaser pages (`/dashboard`, `/login`, `/signup`,
  `/onboarding/*`) — those have their own React layouts.
- Mobile responsive sizing beyond what fits at 1280px viewport
  width.
- Hover tooltips ("X XP to level N+1") — nice-to-have, deferred.
- Click-through actions on the badges (open profile, etc.).
