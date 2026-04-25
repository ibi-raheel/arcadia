# Arcadia

Browser-based 2.5D isometric virtual world platform for content creators and their communities.

Each community (**Realm**) gives members an avatar, a space to gather (**Tavern**), a course viewer (**Academy**), and a course catalogue (**Market**).

---

## Status

🚀 **MVP feature-complete 2026-04-21.** All five phases in `/docs/mvp/phase-plan.md` shipped and verified on prod. 15 of 17 Phase-5 steps landed in code; the two remaining (60 FPS measurement + demo-cut rehearsal) are manual QA that runs before the actual demo recording.

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
- **`/dashboard`** — creator list (role-gated).
- **`/dashboard/courses/[id]`** — two-pane editor (drag-reorder, Markdown + YouTube editors, publish toggle, Analytics pill).
- **`/dashboard/courses/[id]/analytics`** — enrolment count, completion rate, active-in-7d, recent activity.
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
- Polish (collider rects, 60 FPS / demo-cut passes, production hardening) tracked in [`phases/phase-02_polish_backlog.md`](phases/phase-02_polish_backlog.md) + [`phases/phase-05_status.md`](phases/phase-05_status.md).

**Phase exit logs:** [Phase 3](docs/changelog/2026-04-20_phase-03-exit.md) · [Phase 4](docs/changelog/2026-04-21_phase-04-exit.md) · [Phase 5](docs/changelog/2026-04-21_phase-05-exit.md) · [Phase 8](docs/changelog/2026-04-24_phase-08-ui-wireup.md) · [Phase 9](docs/changelog/2026-04-24_phase-09-feed-and-events.md) · [Phase 10](docs/changelog/2026-04-25_phase-10-ai-course-maker.md). Creator-flow setup walkthrough in [`docs/guides/phase-03-setup.md`](docs/guides/phase-03-setup.md); workspace scoping cheat sheet in [`docs/claude-scoping.md`](docs/claude-scoping.md).

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
