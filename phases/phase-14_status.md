# Phase 14 — Status

Source plan: `phase-14_plan.md`. Entries chronological, newest on top.

## 2026-04-26 — 14.6 · post-ship wiring (PR #48 → #57)

Second polish wave on the same feature. Where 14.5 was visual
refinement, this one was wiring: making the bar's three sections do
real work, making the right-hand icons role-aware and clickable, and
adding the persistent ambient music that justifies the overlay
choice. Two unrelated fixes (single-session kick + tavern feed
refetch) shipped in the same window so they're listed here for
continuity rather than splitting the trail.

Bundled write-up in
[`docs/changelog/2026-04-26_phase-14-post-ship-wiring.md`](../docs/changelog/2026-04-26_phase-14-post-ship-wiring.md).

- **PR #48 — three-section bar** — `.hud-section-left/-middle/-right`
  with `flex: 1 1 0` so the three slots are real thirds. Location
  title moved into the middle.
- **PR #49 — role-aware right-section icons** — `MenuIcons` learned
  a `role` prop. Members keep the original 5 placeholders;
  creators/admins get Courses/Events/Members/Billing/Settings.
- **PR #50 (server) — single-session-per-member** — Colyseus room
  tracks one client per `member_id`, kicks the older session on a
  new join with custom close code `4001`.
  `EVICTED_BY_NEW_SESSION_CODE` exported from
  `colyseus-client.ts`.
- **PR #51 + #52 — divider experiment, then Billing + Members
  redesigns** — short-lived vertical bronze dividers; reverted.
  Multi-silhouette `MembersIcon` swapped for a list glyph; coin
  stack `BillingIcon` swapped for a single coin with a serif `$`.
- **PR #53 — occupants count + drop dividers** — middle section
  now stacks the location title above a small `(N wandering)`
  count from a new `useRoomOccupants(room)` hook. Dividers gone.
- **PR #54 — tavern feed refetch** — `TavernFeatures.tsx` refetches
  after `createPost` so the poster sees their own post immediately.
- **PR #55 — wire creator icons to dashboard tabs + rename
  Folk/Payouts** — gave each creator `IconEntry` an `href`. Visible
  tab labels in `DashboardShell.tsx` renamed (`folk` → "members",
  `payouts` → "billing"); routes unchanged so old bookmarks work.
- **PR #56 — persistent ambient music** — new
  `apps/web/components/audio/AmbientMusic.tsx` mounted as a
  sibling of `{children}` in `apps/web/app/layout.tsx`. Survives
  every navigation; gated silent on `/login`, `/signup`,
  `/onboarding/*`. Track at
  `public/audio/Woven_Paths_at_Nightfall.mp3`.
- **PR #57 — open creator dashboard tabs as in-world overlay** —
  the `<Link>`-based route change from #55 tore down the music +
  Phaser canvas + Colyseus state on every click and was surfacing
  a runtime error we couldn't reproduce in the Safari console.
  Replaced `href` with `tab?: DashboardTab`; new
  `DashboardOverlay.tsx` renders an iframe modal at z-index 80
  (Esc + backdrop dismiss; `key={tab}` forces a fresh iframe on
  switch). Dashboard pages remain reachable directly via URL.

All seven CI green on every merge. Member icons remain placeholders
pending the member-dashboard design.

## 2026-04-25 — 14.5 · post-ship polish (PR #30 → #45 trail)

After the initial PR #29 ship, twelve polish PRs reshaped the HUD
based on user feedback (counting doc sweeps #34 + #37 + #43 and
the short-lived #40 that #42 superseded). Consolidated entry
rather than separate ones because they all landed within a few
hours:

- **PR #30 — `feat(hud): consolidate into one full-width bar`** —
  replaced the two-corner layout (`AvatarBadge` + `XPLevelBadge`)
  with a single full-width `PlayerBar.tsx`. The avatar circle was
  removed; the shield anchors the left end now. New
  `MenuIcons.tsx` rides along on the right with four placeholder
  SVG buttons (Profile / Quests / Events / Settings). Deleted
  `AvatarBadge.tsx` and `XPLevelBadge.tsx`. Brown panel introduced.
- **PR #31 — `fix(hud): dark dashboard brown panel + frameless
  filled icons`** — bg → `--ink` (#140a05) at 85% alpha (the same
  near-black brown the creator dashboards use). Icon button
  frames stripped (no border, no bg, no radius). Glyphs redrawn
  as filled silhouettes (was: stroke outlines).
- **PR #32 — `fix(hud): bronze border + flush layout`** — wrote
  `scripts/tint-panel.mjs` (one-off pngjs script) recolouring the
  Kenney panel ornaments cream → bronze. New `panel-bronze.png`
  checked into `apps/web/public/hud/kenney/`. Removed screen-edge
  padding (`top:12 left:12 right:12` → flush). **Restructured each
  Game* page from `relative` outer → `flex flex-col`**: the HUD
  now lives in flex flow (not `position: fixed`) and the Phaser
  canvas is constrained to a `relative flex-1` child below it. The
  avatar can no longer render behind the bar. PomodoroBanner
  bumped from `top: 16` → `top: 80` to clear the bar (HearthPill
  + FocusPill already there from #29).
- **PR #33 — `fix(hud): thinner bronze rim + larger menu icons`** —
  `border-image-width` 12 → 6 (delicate frame, not a wall); icon
  button 32 → 40, glyph 22 → 28.
- **PR #35 — `fix(hud): softer rim, more breathing room, hidden
  during preload`** — `scripts/tint-panel.mjs` gained an optional
  alpha-multiplier arg; re-ran with `0.55` to regenerate
  `panel-bronze.png` (rim opacity dropped from 100% → 55%).
  Coworking pills (`HearthPill`, `FocusPill`, `PomodoroBanner`)
  bumped `top: 80` → `top: 100` for breathing room. `PlayerBar`
  + `PlayerHud` gained a `loaded?: boolean` prop; when false (tied
  to parent's `sceneReady`), the bar reserves layout space but
  renders `visibility: hidden` — HUD stays invisible during scene
  preload, no Phaser canvas resize when it appears.
- **PR #36 — `feat(hud): add Chat icon`** — new `ChatIcon` SVG
  inserted into `MenuIcons.tsx` between Profile and Quests. Menu
  now reads Profile · Chat · Quests · Events · Settings (5 icons,
  was 4). Placeholder `onClick` until the chat route lands.
- **PR #38 — `fix(hud): mono font for username + hide local-avatar
  nameplate`** — `PlayerBar` username swapped IM Fell italic 17px
  → JetBrains Mono 600/15px (matches the Shield digit font).
  `LocalAvatar.visuals.nameText.setVisible(false)` (later wrapped
  by the PR #42 helper) — local in-world nameplate hidden because
  the HUD already shows the same info. Remotes keep theirs.
- **PR #40 — `feat(world): nameplate format (N) Name`** —
  superseded by PR #42 within ten minutes. Kept the trail entry
  for context: parens-prefix was the user's first idea, then they
  asked for a real circular badge, and #42 implemented that.
- **PR #42 — `feat(world): mono-font nameplate + circular level
  badge`** — replaces the parens prefix with a real Phaser `Arc`
  badge (dark `--ink` fill, 1.5 px bronze stroke, gilt digit
  centred). Nameplate font switched Georgia bold → `'JetBrains
  Mono', Menlo, Consolas, monospace`. `AvatarVisuals` shape grew
  `levelBadge` + `levelText`; `nameText` is now name-only. Layout
  `[badge][gap][name]` centred under the avatar. New
  `setVisualsNameplateVisible(visuals, visible)` helper toggles
  all three pieces together; `LocalAvatar` switched its hide
  call to use the helper.
- **PR #45 — `chore(world): bump nameplate sizes a touch`** —
  per user feedback the badge + text read a bit small. Modest
  bumps with no other layout changes: `NAMEPLATE_BADGE_RADIUS`
  10 → 12, `NAMEPLATE_BADGE_GAP` 6 → 7, level digit font
  `12px` → `14px`, display name font `15px` → `17px`.

All twelve CI green on every merge. No phase 14 sub-phase
reopened — this is post-ship polish on the same feature.

## 2026-04-25 — 14.4 · docs (changelog + README + phase-plan + CLAUDE.md routing)

- New `docs/changelog/2026-04-25_phase-14-player-hud.md` with full
  ship report.
- README: intro line bumped seven → eight extension phases; Phase
  14 entry added to recent activity; exit-logs row gets `· [Phase
  14]`.
- `docs/mvp/phase-plan.md` banner: Phase 14 bullet added; "seven"
  → "eight".
- `CLAUDE.md`: naming-convention bullet bumped to 06–14; new
  routing-table row for `/apps/web/components/hud/`.
- `phases/phase-14_status.md`: 14.1 → 14.4 entries.

## 2026-04-25 — 14.3 · mounted PlayerHud across game pages

- `<PlayerHud />` mounted in GameSquare, GameCoworkingInside,
  GameOutdoor, GameTavern (under `fetchState.status === 'ready'`
  guard).
- HearthPill + FocusPill bumped from `top: 16` → `top: 80` so the
  global HUD sits clear above them inside the coworking tent.
- All four CI stages green (320 / 343 passing); `next build`
  green.

## 2026-04-25 — 14.2 · PlayerHud component

- New `apps/web/components/hud/`:
  - `PlayerHud.tsx` — orchestrator + Realtime memberships UPDATE
    subscription.
  - `AvatarBadge.tsx` — top-left, Kenney 9-slice panel + circular
    portrait + display name.
  - `XPLevelBadge.tsx` — top-right, panel + XP track + Shield.
  - `Shield.tsx` — inline SVG heraldic shield with level number.
  - `panel.css` — `.hud-panel` border-image, `.hud-xp-track` /
    `.hud-xp-fill`, `.hud-avatar-circle`. `image-rendering:
    pixelated` on the panel, `auto` on children.
- `packages/shared/src/index.ts` re-exports `progressToNextLevel`
  + `LevelProgress`.

## 2026-04-25 — 14.1 · progressToNextLevel + xp in fetchSession

- `progressToNextLevel(xp)` added to
  `packages/shared/src/gamification/levels.ts`. 7 new vitest cases
  (29 total in that file).
- `SceneMember` (in `WorldScene.ts`) gains `xp: number`. All seven
  construction sites updated:
  GameSquare / GameCoworkingInside / GameOutdoor / GameTavern /
  GameWorld + the SSR `app/{academy,market}/page.tsx`.

## 2026-04-25 — Phase 14 opened (14.0 · plan + ADR + asset ingest)

Branch `feature/player-hud` cut from `main`. Plan + status files in
place. ADR 0018 captures the three rendering choices (Kenney 9-slice
panels, CSS-token fill, SVG shield over PNG asset) + the alternative
considered (adding `xp` to AvatarState — rejected for now since no
other client reads it). Subset of Kenney's "Fantasy UI Borders" v1.0
(CC0) checked in at `apps/web/public/hud/kenney/` — 4 PNGs + license
+ attribution. `apps/web/public/CLAUDE.md` updated to register the
new `hud/` category per its drift rules. Sub-phase ritual from
CLAUDE.md applies; this feature opted into autonomous mode (no per-
sub-phase review, commits + log entries continue).
