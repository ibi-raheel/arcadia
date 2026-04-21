# Arcadia

Browser-based 2.5D isometric virtual world platform for content creators and their communities.

Each community (**Realm**) gives members an avatar, a space to gather (**Tavern**), a course viewer (**Academy**), and a course catalogue (**Market**).

---

## Status

🚀 MVP build — **Phase 3 Week 9 shipped 2026-04-20**. Creator dashboard is live at `/dashboard` (role-gated: `memberships.role in ('creator','admin')`) with course creation, two-pane course editor at `/dashboard/courses/[id]`, drag-reorder sections + lessons (`@dnd-kit/sortable`), Markdown editor for written lessons (`@uiw/react-md-editor`, 2 s debounced autosave), YouTube URL editor for video lessons (demo-only host per ADR 0006), and publish / unpublish toggle. Home page is a role-aware hub: members see **Enter the World**, creators also see **Open the Dashboard**.

**Phase 2** (shipped 2026-04-19): two-tab multiplayer in `/world` (cyberpunk iso map, 4-tileset Tiled scene, remote avatars with linear interpolation) and `/tavern` (image-backed cyberpunk bar, Tab-to-chat with speech bubbles, XP-leaderboard sidebar). Knight + LPC-female avatars have real art; 03–08 render as colour placeholders. Colyseus 0.16 on Railway + Supabase Realtime + RPC-gated reactions (UI currently off per user).

Next up: **Week 10** — member-side course viewer at `/academy` + YouTube IFrame Player + progress tracking. See [`phases/phase-03_status.md`](phases/phase-03_status.md) for the Phase 3 log, [`phases/phase-02_status.md`](phases/phase-02_status.md) for the Phase 2 log, [`docs/guides/phase-03-setup.md`](docs/guides/phase-03-setup.md) for the creator-flow setup walkthrough, and [`docs/claude-scoping.md`](docs/claude-scoping.md) for where to `cd` when opening Claude.

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
