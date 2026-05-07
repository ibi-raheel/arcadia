# Arcadia

Browser-based 2.5D isometric virtual world platform for content creators and their communities.

Each community (**Realm**) gives members an avatar, a space to gather (**Tavern**), a course viewer (**Academy**), and a course catalogue (**Market**).

---

## Status

🚀 **MVP shipped 2026-04-21; post-MVP feature work continued 2026-04-22 → 25.** The original 6-phase build (0–5) in `/docs/mvp/phase-plan.md` is verified on prod. Eight extension phases shipped on top: world rendering rebuild (image-backed), Phase 8 UI wire-up, Phase 9 feed + events, Phase 10 AI scribe, Phase 11 sage + UI legibility audit (the AI portion was retired in Phase 13 in favour of a static welcome — see ADR 0017), Phase 12.A coworking productivity, Phase 13 sage as static welcome, Phase 14 persistent player HUD. 15 of 17 Phase-5 steps landed in code; the two remaining (60 FPS measurement + demo-cut rehearsal) are manual QA before the demo recording.

**What's live at `arcadia-web-swart.vercel.app`:**

- **`/`** — role-aware hub (World / Market / Dashboard).
- **`/world`** — image-backed town square, Colyseus-synced on `world-realm1` (auto-shards at 20 clients). Walk off any edge to the neighbour: N→`/academy-outside`, E→`/tavern-outside`, S→`/market`, W→`/coworking`. Capacity HUD top-right. *(2026-04-22: replaced the ADR-0007 Tiled square with this image-backed scene.)*
- **`/academy-outside`** — single-player outdoor area. Walk up to the gate, press ENTER → `/academy`.
- **`/tavern-outside`** — single-player outdoor area. Three distinct tavern doors (The Three Ravens / The Iron Chalice / The Sleeping Hollow); ENTER opens the matching tavern (`?b=tavern-a/b/c`).
- **`/coworking`** — single-player outdoor area. Five tents; ENTER enters the matching tent (`?b=tent-1..5`).
- **`/coworking/inside?b=<id>`** — tent interior, multiplayer. Colyseus `coworking-realm1` with `filterBy(['building'])` — members in different tents never meet even with same interior art. Auto-shards at 20 clients.
- **`/tavern?b=<id>`** — image-backed bar, Tab-to-chat with speech bubbles, live XP leaderboard. Same interior visuals across all three tavern buildings; `filterBy(['building'])` keeps the social spaces distinct.
- **`/academy`** — Phaser course hall with walkable podiums.
- **`/academy/[courseId]`** — YouTube IFrame Player (resume + 80% completion) + `react-markdown` lessons (scroll-to-complete).
- **`/market`** — Phaser interior with a central crystal. Walk to the crystal + ENTER → fullscreen four-stall dashboard overlay (Courses · Templates · Tools · Exclusives). Picker is a 3-up top row + a wide gilt-haloed Exclusives card on the bottom. **Courses** are real DB rows (published + same-realm via RLS) and use the existing `enrolInCourse` server action. **Templates / Tools / Exclusives** are simulated fixtures (mix of free + priced); ownership is in-memory, no real payments. Pricing displays as `$X`. Overlay header is just **✕ close** (closing returns the player to the Phaser scene; logout lives on the dashboards). See [PR #59–#61 changelog trail](docs/changelog/2026-05-02_market-and-audio-polish.md).
- **`/dashboard`** — creator studio (role-gated). 6 tabs: studio · courses · events · folk · payouts · settings. Scriptorium-styled per Phase 8.
- **`/dashboard/courses/[id]`** — drag-reorder section/lesson tree + TipTap WYSIWYG lesson editor (Phase 10) + YouTube editor + publish toggle + Analytics pill. Replaced the old `@uiw/react-md-editor` split-pane.
- **`/dashboard/courses/conjure`** *(Phase 10 — the Scribe)* — staged AI course maker. Satchel accepts PDFs/DOCX/TXT/MD as grounding context; Gemini drafts outline → lesson bodies → images across four approvable streaming stages; seal materializes real courses + sections + lessons rows. Per-creator "scribe's memory" (voice, image style, audience) persists across drafts.
- **`/dashboard/events`** *(Phase 9)* — schedule + manage live events. KPI strip + live/upcoming/past sections; events drive the tavern's "live now" banner + YouTube stage overlay.
- **`/dashboard/courses/[id]/analytics`** — enrolment count, completion rate, active-in-7d, recent activity.
- **The Wanderer (`/world`)** *(Phase 11 → revised Phase 13)* — bearded merchant on the rug in the top-left of the square. Walk near him + ENTER → "welcome, traveller" panel + 4 flip cards (Academy / Square / Tavern / Coworking — Tavern replaced Dashboard in PR #39 as the more member-relevant surface). Static; no AI calls (ADR 0017 supersedes 0014).
- **Tavern feed** *(Phase 9)* — tablet on the back wall of every tavern; ENTER opens an async feed showing creator posts + scheduled events. Live events get a verdigris banner + stage embed.
- **Gamification** — lesson completion → +25 XP via DB trigger → level recomputes → banner animates → peer badges sync via Colyseus `UPDATE_LEVEL`.

**Video host is YouTube unlisted** (ADR 0006, demo-only scope — swap to a real host required before paying creators).

**Beyond the MVP plan:**
- 2026-04-22 (morning): world swap to orthogonal top-down Tiled square (ADR 0007 implemented; see [changelog](docs/changelog/2026-04-22_world-swap-orthogonal-square.md)).
- 2026-04-22 (evening): image-backed world + 3 outdoor neighbour scenes + per-building Colyseus sharding + capacity HUD (see [changelog](docs/changelog/2026-04-22_image-backed-world.md)).
- 2026-04-23: shipped to prod with extensive polish — ENTER-key gates, archway-proximity exits, Georgia-serif nameplate, door-aware returns, zoom/walk-speed tuning, Phaser physics-body fix (ADR 0008). Full write-up in [changelog](docs/changelog/2026-04-23_image-backed-world-complete.md).
- 2026-04-24: **Phase 8 · UI wire-up** — every React surface rebuilt on the midnight-scriptorium design system (tokens + primitives + simulation toggle + 26-item kit-backfill pass across dashboard / academy / market / login / landing). See [changelog](docs/changelog/2026-04-24_phase-08-ui-wireup.md). Public `/kit` renders the live design system; `/preview/*` routes render every dashboard tab against fixtures for design review without a session.
- 2026-04-24: **Phase 9 · async feed + live events** — tablet-triggered scriptorium feed in the tavern, `/dashboard/events` management tab, verdigris "live now" banner + YouTube stage overlay when an event is live in-shard, upcoming-event pill on `/` + studio. Migration `20260424000001_phase9_feed_and_events.sql` applied to prod. See [changelog](docs/changelog/2026-04-24_phase-09-feed-and-events.md).
- 2026-04-25: **Phase 10 · the scribe (AI course maker)** — new `/dashboard/courses/conjure` workbench. Satchel accepts PDF/DOCX/TXT/MD grounding material; Gemini drafts outline → lesson bodies → images across four approvable streaming stages with inline re-roll feedback; seal materializes a real courses/sections/lessons tree. Per-creator "scribe's memory" (voice, image style, audience) injected into every prompt. Bundled with a TipTap WYSIWYG replacement for the lesson editor (`@uiw/react-md-editor` retired). Wired through `@ai-sdk/google` directly (Gemini 2.5 Pro/Flash + Imagen 4 Fast, ADR 0013 supersedes ADR 0011's Gateway pick). Three migrations applied to prod. See [changelog](docs/changelog/2026-04-25_phase-10-ai-course-maker.md).
- 2026-04-25: **Phase 11 · the Sage** — the bearded merchant in the upper-left of the square is now an AI guide. Walk near him + ENTER → scriptorium chat popup. Knowledge corpus baked from `/docs/mvp` + every ADR + README + recent changelog (no RAG, ADR 0014). Conversation persists in localStorage. Bundled with a deep UI legibility audit. See [changelog](docs/changelog/2026-04-25_phase-11-sage-and-ui-audit.md).
- 2026-04-25: **Phase 12.A · coworking productivity** — five surfaces wired to objects already drawn into the tent PNG. Jukebox (right wall, shared station, per-tab volume + 4 ambient tracks). Hourglass (wooden chest, shared Pomodoro with server-clock ticker). Hearth pill (top-right, room occupancy + in-flow count). **Focus pill** (top-left, "what I'm working on" line that renders above the avatar's nameplate everywhere; per-avatar state via `currentFocus` on `AvatarState`). Pomodoro banner (top-centre, lantern → verdigris on phase change). Per-tent state on the Colyseus room; new `JukeboxState` + `PomodoroState` schemas + 4 protocol messages (`SET_JUKEBOX`, `START_POMODORO`, `STOP_POMODORO`, `SET_FOCUS`). ADR 0016 captures the hand-pick-coords-over-PNG pattern. See [changelog](docs/changelog/2026-04-25_phase-12-coworking-productivity.md).
- 2026-04-25: **Phase 13 · sage as static welcome** — the AI Sage (Phase 11) was retired the same week it shipped. The bearded merchant's popup is now a static "welcome, traveller" panel + four flip cards (Academy, Square, Tavern, Coworking — PR #39 swapped Dashboard → Tavern as the more member-relevant surface). Front of each card: sigil + label + tagline; back: 2–3 sentences + a navigation hint. Click / Enter / Space flips. Zero recurring API cost; the Scribe's Gemini wiring is untouched and still powers `/dashboard/courses/conjure`. ADR 0017 supersedes ADR 0014. See [changelog](docs/changelog/2026-04-25_phase-13-sage-static-welcome.md).
- 2026-04-25: **Phase 14 · persistent player HUD** — the player's identity + menu shortcuts follow them across every Phaser scene. **One full-width bar at the top:** heraldic SVG shield (level number) + display name in **JetBrains Mono 600/17** + XP progress bar (current → next-level) + five placeholder menu icons (Profile / Chat / Quests / Events / Settings). Dark brown panel (`--ink` at 85% alpha) with a bronze 9-sliced `border-image` from a Kenney "Fantasy UI Borders" PNG (CC0, recoloured cream → bronze via `scripts/tint-panel.mjs` at α 0.55 for a soft rim). The bar lives in the page's flex flow (not a fixed overlay) so the Phaser canvas claims `flex-1` below it — world art and the avatar can't render behind it; the bar also stays hidden during scene preload (`loaded={sceneReady}` → `visibility: hidden` until ready). Modals at z-index 80 still obscure the HUD. **The local player's in-world nameplate is hidden** (the HUD shows the same info); remote peers' nameplates render as a small circular bronze-rimmed Arc badge with the gilt level digit on the left + the display name in mono on the right. Initial ship + twelve polish iterations (PR #30 → #45) bundled in [changelog](docs/changelog/2026-04-25_phase-14-player-hud.md); ADR 0018 records the rendering choices.
- 2026-04-26: **Phase 14 · post-ship wiring (PR #48 → #57)** — second polish wave on the same HUD. The bar's right-side row of icons grew into a real **three-section layout**: left = shield + name + XP, middle = location title + live `(N wandering)` occupants count, right = role-aware icons. **Right section is now role-aware**: members see Profile / Chat / Quests / Events / Settings (still placeholders), creators + admins see Courses / Events / Members / Billing / Settings. **Creator icons open the matching dashboard tab as an in-world iframe overlay** (`DashboardOverlay`) instead of route-changing — the persistent ambient music + Phaser canvas + Colyseus connection never tear down. Bundled with PR #56's **persistent ambient music** (`Woven_Paths_at_Nightfall.mp3` mounted as a sibling of `{children}` in the root layout, gated silent on `/login` / `/signup` / `/onboarding/*`), PR #55's **dashboard tab rename** (`folk` → "members", `payouts` → "billing"; routes unchanged), PR #50's **single-session-per-member** server fix (kicks old tab on new join with close code 4001), and PR #54's **tavern feed refetch** so the poster sees their own post. See [changelog](docs/changelog/2026-04-26_phase-14-post-ship-wiring.md).
- 2026-05-02: **Phase 14 · market rework + HUD/auth polish (PR #58 → #61)** — Four follow-up PRs on top of the post-ship wiring. **PR #58** rewires the dashboard "exit" button to a real signout form (labelled **logout**), banks autoplay permission inside the **login submit handler**, and **prewarms a hidden `/dashboard` iframe** on `requestIdleCallback` so the first creator-icon click drops from ~600–1500 ms to ~50–200 ms. **PR #59 + #60** rework `/market`: it routes back to the Phaser `MarketScene`; walking to the central crystal + ENTER opens a fullscreen four-stall dashboard (Courses · Templates · Tools · Exclusives) as an in-world `MarketOverlay` over the canvas (same page, not iframe — keeps audio + canvas alive). Courses are real DB rows; Templates / Tools / Exclusives are simulated fixtures with `$X` pricing and a 700 ms "stamping…" purchase flip. **PR #61** is three rounds of polish on top: dashboard ← return-to-world removed (logout-only); MarketOverlay header trimmed to just ✕ close (the path-aware ← world / logout / `?from=square` plumbing was rolled back); CategoryPicker grew a 3-up + 1-wide layout with a thicker pulsing gilt halo on Exclusives + responsive grid; CategoryView item rows tightened (compact PriceTag pill instead of the heavy Chip); **AmbientMusic rewritten as a YouTube-pattern single-state machine** — no more `<audio autoPlay>` racing JS, no more retry-on-window-pointerdown that missed iframe clicks, no more pre-hydration audible flash. The legacy `CatalogScroll` + `?course=<id>`-driven `StallView` are preserved on disk for reference. See [PR #59–#60 changelog](docs/changelog/2026-05-02_market-overlay-and-polish.md) + [PR #61 changelog](docs/changelog/2026-05-02_market-and-audio-polish.md).
- 2026-05-06: **Demo NPCs + simulation toggle pill (PR #62)** — autonomous wandering NPCs populate every Phaser scene when simulation mode is on. New shared `NpcSwarm` (`scenes/shared/npc-swarm.ts`) reuses the existing `avatar-renderer` + `avatar-animations` so each NPC reads identical to a real peer (same sprite, nameplate with random level 1–12, walk anims). State machine: walking → arrive → idle 1–4 s → repeat; per-NPC speech bubbles every 5–14 s pulled from a 30-line ambient pool. Speech bubble factory extracted to a shared `scenes/shared/speech-bubble.ts` so the player tavern chat + NPC mutterings render identically; bubble visuals also bumped (font 14→18 px, max-width 200→290 px). NPCs total ~36 across the 8 scenes (Square 6, Market/Academy/Tavern/Coworking-inside 5 each, three outdoor scenes 5 each via the shared base). New `<SimulationPill />` component (bottom-left, always-visible, off=outline / on=lantern fill) mounted in `app/layout.tsx` as a sibling of `<AmbientMusic />` — flipping it spawns/despawns the swarm immediately via the new `SIM_CHANGE_EVENT` window event. Pill hides itself inside iframes (so the in-world DashboardOverlay's iframe doesn't render its own pill on top of the dashboard) and sits at z-70 (below the overlay backdrop at z-80). The redundant `SimulationBadge` mount was removed from `DashboardShell` — the inline `<SimulationToggle />` in the header is the canonical sim control inside the dashboard view. ADR 0010 amended. See [changelog](docs/changelog/2026-05-06_demo-npcs-and-sim-pill.md).
- 2026-04-25: **Hotfix · server room bounds aligned with image-backed world** — peers were seeing each other at *wrong* positions in `/world` and `/tavern` because the server's `room-config.ts` was never updated when those routes swapped to image-backed scenes on 2026-04-22. Server's `applyMove` was silently clamping incoming MOVE coords to the old iso bounds. Snapped server bounds + spawn to match the client image dimensions (square `0..2508`, tavern `0..1536 / 0..1024`); coworking was correct already. Railway must redeploy `@arcadia/game-server` for it to land in prod. See [hotfix changelog](docs/changelog/2026-04-25_hotfix-server-room-bounds.md).
- Polish (collider rects, 60 FPS / demo-cut passes, production hardening) tracked in [`phases/phase-02_polish_backlog.md`](phases/phase-02_polish_backlog.md) + [`phases/phase-05_status.md`](phases/phase-05_status.md).

**Phase exit logs:** [Phase 3](docs/changelog/2026-04-20_phase-03-exit.md) · [Phase 4](docs/changelog/2026-04-21_phase-04-exit.md) · [Phase 5](docs/changelog/2026-04-21_phase-05-exit.md) · [Phase 8](docs/changelog/2026-04-24_phase-08-ui-wireup.md) · [Phase 9](docs/changelog/2026-04-24_phase-09-feed-and-events.md) · [Phase 10](docs/changelog/2026-04-25_phase-10-ai-course-maker.md) · [Phase 11](docs/changelog/2026-04-25_phase-11-sage-and-ui-audit.md) · [Phase 12.A](docs/changelog/2026-04-25_phase-12-coworking-productivity.md) · [Phase 13](docs/changelog/2026-04-25_phase-13-sage-static-welcome.md) · [Phase 14](docs/changelog/2026-04-25_phase-14-player-hud.md) · [Phase 14 post-ship wiring](docs/changelog/2026-04-26_phase-14-post-ship-wiring.md) · [Market rework](docs/changelog/2026-05-02_market-overlay-and-polish.md) · [Market + audio polish](docs/changelog/2026-05-02_market-and-audio-polish.md) · [Demo NPCs + sim pill](docs/changelog/2026-05-06_demo-npcs-and-sim-pill.md). Creator-flow setup walkthrough in [`docs/guides/phase-03-setup.md`](docs/guides/phase-03-setup.md); workspace scoping cheat sheet in [`docs/claude-scoping.md`](docs/claude-scoping.md).

### Live services

| Service | URL |
|---|---|
| Web (Next.js, Vercel) | https://arcadia-web-swart.vercel.app |
| Isometric spike (Phaser 3.88) | https://arcadia-web-swart.vercel.app/spike |
| Game server (Colyseus, Railway) | wss://arcadia-production-c635.up.railway.app |
| Game-server health | https://arcadia-production-c635.up.railway.app/health |
| Supabase (production) | https://eqbzltiasmuckgsapkye.supabase.co |
| Supabase (test — cross-member leakage harness) | https://idxgcrwikmcuqrrxbogj.supabase.co |

## Docs

- [`docs/mvp/prd.md`](docs/mvp/prd.md) — product requirements (MVP v1.1)
- [`docs/mvp/tad.md`](docs/mvp/tad.md) — technical architecture (MVP v1.1)
- [`docs/mvp/phase-plan.md`](docs/mvp/phase-plan.md) — 12-week phased build (MVP v1.1)
- [`docs/art/sprite-requirements.md`](docs/art/sprite-requirements.md) — full art-order spec
- [`planning/decisions/`](planning/decisions/) — architecture decision records (ADRs)
- [`CLAUDE.md`](CLAUDE.md) — workspace routing, conventions, tooling

## Stack

Next.js 14 on Vercel · Phaser 3.88 · Colyseus 0.16 on Railway (Redis) · Supabase (Postgres + RLS + Auth + Realtime + Storage) · YouTube unlisted (MVP demo video host, per ADR 0006 — CF Stream is the post-MVP target) · `@dnd-kit` · `@uiw/react-md-editor` · Tailwind 3 · TypeScript 5 · Tiled

Full rationale: [`planning/decisions/0001_2026-04-18_locked-stack.md`](planning/decisions/0001_2026-04-18_locked-stack.md).

## Repo layout

- `apps/web` — Next.js client (Vercel)
- `apps/game-server` — Colyseus server (Railway)
- `packages/shared` — shared TypeScript types, protocol, constants
- `docs/` — canonical MVP docs, API reference, guides, changelog, art spec
- `planning/` — specs, architecture, ADRs
- `phases/` — phase plans and status logs
- `ops/` — deploy, monitoring, scripts

## Development

Requires **Node 22.12+ or Node 24+** (the game server hits `require(ESM)` via Colyseus's `rou3` transitive dep, which only works on those versions — or on Node 22.x with `--experimental-require-module`, which the game-server's `start` script already passes). Local dev on Node 24 LTS via `nvm use` is the tested path; Railway production runs Node 22.11 with the flag.

```bash
npm install        # installs all workspaces
npm run lint       # ESLint across all workspaces
npm run typecheck  # tsc --noEmit across all workspaces
npm run test       # Vitest across all workspaces
npm run format     # Prettier write across code files
```

Per-workspace dev commands (e.g. `next dev`, `tsx watch`) live in each `apps/*` and `packages/*` `package.json`.
