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
- **`/market`** — Phaser stall hall with search HUD; click a stall → modal with blurred backdrop, inline previews, one-click enrol, real enrolment counts.
- **`/dashboard`** — creator studio (role-gated). 6 tabs: studio · courses · events · folk · payouts · settings. Scriptorium-styled per Phase 8.
- **`/dashboard/courses/[id]`** — drag-reorder section/lesson tree + TipTap WYSIWYG lesson editor (Phase 10) + YouTube editor + publish toggle + Analytics pill. Replaced the old `@uiw/react-md-editor` split-pane.
- **`/dashboard/courses/conjure`** *(Phase 10 — the Scribe)* — staged AI course maker. Satchel accepts PDFs/DOCX/TXT/MD as grounding context; Gemini drafts outline → lesson bodies → images across four approvable streaming stages; seal materializes real courses + sections + lessons rows. Per-creator "scribe's memory" (voice, image style, audience) persists across drafts.
- **`/dashboard/events`** *(Phase 9)* — schedule + manage live events. KPI strip + live/upcoming/past sections; events drive the tavern's "live now" banner + YouTube stage overlay.
- **`/dashboard/courses/[id]/analytics`** — enrolment count, completion rate, active-in-7d, recent activity.
- **The Wanderer (`/world`)** *(Phase 11 → revised Phase 13)* — bearded merchant on the rug in the top-left of the square. Walk near him + ENTER → "welcome, traveller" panel + 4 flip cards (Academy / Square / Dashboard / Coworking). Static; no AI calls (ADR 0017 supersedes 0014).
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
- 2026-04-25: **Phase 13 · sage as static welcome** — the AI Sage (Phase 11) was retired the same week it shipped. The bearded merchant's popup is now a static "welcome, traveller" panel + four flip cards (Academy, Square, Dashboard, Coworking). Front of each card: sigil + label + tagline; back: 2–3 sentences + a navigation hint. Click / Enter / Space flips. Zero recurring API cost; the Scribe's Gemini wiring is untouched and still powers `/dashboard/courses/conjure`. ADR 0017 supersedes ADR 0014. See [changelog](docs/changelog/2026-04-25_phase-13-sage-static-welcome.md).
- 2026-04-25: **Phase 14 · persistent player HUD** — the player's identity + menu shortcuts follow them across every Phaser scene. **One full-width bar at the top:** heraldic SVG shield (level number) + display name + XP progress bar (current → next-level) + four placeholder menu icons (Profile / Quests / Events / Settings). Dark brown panel (`--ink` at 85% alpha) with bronze 9-sliced `border-image` from a Kenney "Fantasy UI Borders" PNG (CC0, recoloured cream → bronze via `scripts/tint-panel.mjs`). The bar lives in the page's flex flow (not a fixed overlay) so the Phaser canvas claims `flex-1` below it — world art and the avatar can't render behind it. Modals at z-index 80 still obscure the HUD. Initial ship + four polish iterations (PR #30 → #33) bundled in [changelog](docs/changelog/2026-04-25_phase-14-player-hud.md); ADR 0018 records the rendering choices.
- Polish (collider rects, 60 FPS / demo-cut passes, production hardening) tracked in [`phases/phase-02_polish_backlog.md`](phases/phase-02_polish_backlog.md) + [`phases/phase-05_status.md`](phases/phase-05_status.md).

**Phase exit logs:** [Phase 3](docs/changelog/2026-04-20_phase-03-exit.md) · [Phase 4](docs/changelog/2026-04-21_phase-04-exit.md) · [Phase 5](docs/changelog/2026-04-21_phase-05-exit.md) · [Phase 8](docs/changelog/2026-04-24_phase-08-ui-wireup.md) · [Phase 9](docs/changelog/2026-04-24_phase-09-feed-and-events.md) · [Phase 10](docs/changelog/2026-04-25_phase-10-ai-course-maker.md) · [Phase 11](docs/changelog/2026-04-25_phase-11-sage-and-ui-audit.md) · [Phase 12.A](docs/changelog/2026-04-25_phase-12-coworking-productivity.md) · [Phase 13](docs/changelog/2026-04-25_phase-13-sage-static-welcome.md) · [Phase 14](docs/changelog/2026-04-25_phase-14-player-hud.md). Creator-flow setup walkthrough in [`docs/guides/phase-03-setup.md`](docs/guides/phase-03-setup.md); workspace scoping cheat sheet in [`docs/claude-scoping.md`](docs/claude-scoping.md).

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
