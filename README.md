# Arcadia

Browser-based 2.5D isometric virtual world platform for content creators and their communities.

Each community (**Realm**) gives members an avatar, a space to gather (**Tavern**), a course viewer (**Academy**), and a course catalogue (**Market**).

---

## Status

🛠️ MVP build — Phase 0 (Foundation). See [`phases/phase-00_status.md`](phases/phase-00_status.md) for live status.

## Docs

- [`docs/mvp/prd.md`](docs/mvp/prd.md) — product requirements (MVP v1.1)
- [`docs/mvp/tad.md`](docs/mvp/tad.md) — technical architecture (MVP v1.1)
- [`docs/mvp/phase-plan.md`](docs/mvp/phase-plan.md) — 12-week phased build (MVP v1.1)
- [`docs/art/sprite-requirements.md`](docs/art/sprite-requirements.md) — full art-order spec
- [`planning/decisions/`](planning/decisions/) — architecture decision records (ADRs)
- [`CLAUDE.md`](CLAUDE.md) — workspace routing, conventions, tooling

## Stack

Next.js 14 on Vercel · Phaser 3.88 · Colyseus 0.17 on Railway (Redis) · Supabase (Postgres + RLS + Auth + Realtime + Storage) · Cloudflare Stream · Tailwind 3 · TypeScript 5 · Tiled

Full rationale: [`planning/decisions/2026-04-18_locked-stack.md`](planning/decisions/2026-04-18_locked-stack.md).

## Repo layout

- `apps/web` — Next.js client (Vercel)
- `apps/game-server` — Colyseus server (Railway)
- `packages/shared` — shared TypeScript types, protocol, constants
- `docs/` — canonical MVP docs, API reference, guides, changelog, art spec
- `planning/` — specs, architecture, ADRs
- `phases/` — phase plans and status logs
- `ops/` — deploy, monitoring, scripts

## Development

Requires Node 20+ (monorepo tested on Node 24 LTS).

```bash
npm install        # installs all workspaces
npm run lint       # ESLint across all workspaces
npm run typecheck  # tsc --noEmit across all workspaces
npm run test       # Vitest across all workspaces
```

Per-app commands live in each workspace's `package.json`.
