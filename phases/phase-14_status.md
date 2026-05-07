# Phase 14 — Status

Source plan: `phase-14_plan.md`. Entries chronological, newest on top.

## 2026-05-06 — 14.9 · demo NPCs + simulation toggle pill (PR #62)

Pure demo polish so Loom recordings can show a populated world
instead of an empty one. Six commits in a single PR
(cc54b81 → b9313ed). Same Phase-14 banner since the work uses the
existing avatar-renderer + scriptorium primitives + simulation-mode
infra rather than introducing a new architectural layer.

Bundled write-up in
[`docs/changelog/2026-05-06_demo-npcs-and-sim-pill.md`](../docs/changelog/2026-05-06_demo-npcs-and-sim-pill.md).

- **`apps/web/components/game/scenes/shared/npc-swarm.ts`** — new
  `NpcSwarm` class. Reuses `avatar-renderer` + `avatar-animations`
  so each NPC renders identical to a real remote peer (sprite +
  nameplate + level badge + walk anims). State machine: walking →
  arrive (within 6 px) → idle 1–4 s → pick new target → repeat.
  Per-NPC random level (1–12). 8-persona pool alternating
  avatar-01 + avatar-02 with placeholder names. Walk speed matches
  each scene's player `walkSpeed`. **Visual-only** (no physics, no
  collider awareness — NPCs may pass through chairs/crystals;
  acceptable for demo). **Client-only** (not Colyseus-synced;
  different tabs see different NPC arrangements).
- **`apps/web/components/game/scenes/shared/speech-bubble.ts`** —
  extracted from `TavernScene.ts`. `createSpeechBubble`,
  `SPEECH_BUBBLE_DEPTH`, `SPEECH_BUBBLE_DURATION_MS`,
  `SPEECH_BUBBLE_Y_OFFSET` now shared between the player tavern
  chat and the NPC ambient mutterings. Visuals also bumped: font
  14→18 px, max-width 200→290 px, padding 6/10→9/14 px.
- **30 random ambient lines** (`NPC_MESSAGES` in npc-swarm.ts) —
  mix of in-character ("the lantern moved on its own") and
  creator-life ("brb refilling the inkwell"). Each NPC speaks
  every 5–14 s with 5 s bubble lifetime; first-bubble offsets
  staggered so the swarm doesn't chatter in sync.
- **`apps/web/components/scriptorium/simulation.tsx`** — new
  `<SimulationPill />` export. Fixed bottom-left, always-visible
  toggle (off=outline, on=lantern fill). Mounted in
  `app/layout.tsx` as a sibling of `<AmbientMusic />`. Path-gates
  internally to skip /login, /signup, /onboarding/*. **Hidden
  inside iframes** (so the in-world `DashboardOverlay`'s iframe
  doesn't render its own pill) and at z-70 (below the overlay
  backdrop at z-80).
- **`apps/web/lib/simulation-mode.ts`** — exported `SIM_CHANGE_EVENT`
  (was a module-private constant). The NPC swarm listens to this
  on `window` so flipping the pill (or any other sim toggle)
  spawns/despawns the entire swarm in real-time.
- **`apps/web/components/dashboard/DashboardShell.tsx`** —
  `<SimulationBadge />` mount removed. The inline
  `<SimulationToggle />` already in the header is the canonical
  sim control inside the dashboard view; the floating top-right
  badge was an extra surface. The component itself is preserved
  for `/kit` + `/preview/*` debug routes.
- **8 scene `create()` patches** (3 lines each — field, swarm
  spawn after `registerAvatarAnimations()`, tick in `update()`):
  - SquareScene → 6 NPCs at speed 325
  - MarketScene → 5 NPCs at speed 200
  - AcademyScene → 5 NPCs at speed 200
  - TavernScene → 5 NPCs at speed 200 + bubble factory imports
    from shared (replaces local copy)
  - CoworkingInsideScene → 5 NPCs at speed 270 (locked at 5 per
    user feedback — focus pill UX competes for nameplate
    attention)
  - OutdoorSceneBase → 5 NPCs at speed 325 (applies to
    AcademyOutsideScene + TavernOutsideScene + CoworkingOutsideScene
    via inheritance)
- **ADR 0010 amended** — the visible simulation indicator's
  position + lifecycle changed (top-right badge → bottom-left pill;
  always-visible vs only-when-on; iframe-aware). Persistence +
  URL-override + cookie-mirror behaviour unchanged.

Net result: ~36 NPCs across the world when sim is on; player is
alone when sim is off (default). Toggle from anywhere — pill,
inline dashboard toggle, `?sim=1` URL — and the swarm flips
immediately, no scene reload.

All six commits CI green on every push. No new ADR (this re-uses
the existing simulation-mode infra; ADR 0010 amendment is
sufficient).

## 2026-05-02 — 14.8 · market + audio polish (PR #61)

Three rounds of follow-up on PR #58 → #60, all bundled into a single
PR (three commits — d15e60d, f8e21d4, 5680d7d). Same Phase-14 banner
because the work is still polish on the same in-world-overlay
pattern.

Bundled write-up in
[`docs/changelog/2026-05-02_market-and-audio-polish.md`](../docs/changelog/2026-05-02_market-and-audio-polish.md).

- **Round 1 (d15e60d)** — initial pass: dashboard ← return-to-world
  removed (logout-only); mute button z-index 50 → 95; square south
  edge tagged `?from=square`; MarketOverlay header conditionally
  rendered (✕ for square entry; ← world + logout for direct);
  CategoryPicker switched to 3 + 1 layout with a gilt halo on
  Exclusives.
- **Round 2 (f8e21d4)** — user feedback: strip the ← world / logout
  buttons entirely (rolling back the path-aware `enteredVia`
  plumbing — square south edge route reverted to plain `/market`,
  searchParams Params + GameMarket prop + MarketOverlay branch all
  removed). CategoryPicker top row made responsive (3 → 2 → 1
  cols via `.market-picker-top-row` class + media queries).
  CategoryView item rows tightened (compact `PriceTag` pill instead
  of the heavy `<Chip>`). Exclusives glow class moved from a
  wrapper div onto the `LedgerCard` itself (matching border-radius)
  and beefed up significantly (3 px solid gilt rim + 24 px halo
  baseline, 4 px / 42 px peak).
- **Round 3 (5680d7d)** — AmbientMusic full rewrite. User report:
  *"starts paused sometimes, mute button doesn't toggle, autoplays
  on its own."* Root causes: `<audio autoPlay>` racing JS `play()`,
  retry-on-`window`-pointerdown missing iframe clicks, separate
  effects for muted / volume / play racing each other, hydration
  flash before localStorage mute kicked in. Replaced with a single
  state-machine YouTube-pattern player: always start muted,
  `effectiveMuted = userMuted || !activated`, one useEffect drives
  everything, document-level capture-phase listener catches
  same-origin iframe clicks too.

All three rounds CI green on every push. Member icons in the HUD
remain placeholders pending the member-dashboard design (unchanged
from §14.7).

## 2026-05-02 — 14.7 · market rework + HUD/auth polish (PR #58 → #60)

Three-PR cluster on top of 14.6, all merged 2026-05-02. The HUD + auth
PR (#58) is small follow-up wiring; the market PRs (#59 → #60) are
big enough that they could have been their own phase, but staying
under Phase 14's "post-ship polish" banner keeps history coherent
since they share the in-world overlay pattern PR #57 introduced.

Bundled write-ups:
- HUD/auth small-wires: `feat(hud+auth): logout button + login music
  gesture-bank + dashboard prewarm` (PR #58 commit message).
- Market rework + polish:
  [`docs/changelog/2026-05-02_market-overlay-and-polish.md`](../docs/changelog/2026-05-02_market-overlay-and-polish.md).

- **PR #58 — HUD + auth small wires**
  - Dashboard "exit" button (a `<Link href="/">`) replaced with a
    real signout `<form action="/api/auth/signout" target="_top">`
    labelled "logout". `target="_top"` matters because the dashboard
    now opens inside the `DashboardOverlay` iframe — without it the
    parent window would still look authed.
  - Login form `handleSubmit` synchronously banks autoplay
    permission on the audio element (now tagged
    `data-arcadia-ambient`) before the await — fixes the autoplay-
    policy delay where music waited for the user's next click on /.
  - `MenuIcons` mounts a hidden 0×0 prewarm `<iframe>` at
    `/dashboard` for creators on `requestIdleCallback` — drops the
    first creator-icon click latency from ~600–1500 ms to
    ~50–200 ms.
- **PR #59 — four-stall market (initial)** — `/market` rewired from
  the Phaser scene to a React four-stall dashboard (Courses /
  Patterns / Tools / Exclusives). Hand-authored fixtures for the 3
  simulated categories (`apps/web/lib/market/fixtures.ts`). Real
  `enrolInCourse` action used for Courses; simulated 700 ms
  "stamping…" for the others. Phaser `MarketScene` + `CatalogScroll`
  + `StallView` preserved on disk, unmounted.
- **PR #60 — market rework: in-world overlay + polish** — Reverses
  PR #59's "kill the Phaser scene" decision. `/market` routes back
  to the Phaser `MarketScene`; the four-stall dashboard now opens
  as a fullscreen `MarketOverlay` over the canvas when the player
  walks to the central crystal and presses ENTER (same-page React,
  not iframe — keeps Phaser canvas + ambient music alive). Bundled:
  - **Patterns → Templates** rename everywhere (type id, fixtures
    key, fixture id prefix `pattern-` → `template-`, kicker text,
    picker copy). Tools' seal letter shifted T → W to dodge the
    new T-clash.
  - **`$X` pricing** instead of "X coin" — both `PriceTag` and the
    paid action button label.
  - **Wider layout** — picker maxWidth 1080→1280, category view
    1180→1480, list rail 280-360 → 320-420.
  - **Logout + return-to-world buttons** in the overlay header
    (top-right, z-index 90) — closes the gap where members had no
    logout path from `/market`.

All three CI green on every merge. The legacy `CatalogScroll` +
`?course=<id>`-driven `StallView` flow is fully retired; the
components stay on disk for reference.

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
