# Workspace: Apps

## Purpose

Deployable applications. Each immediate subfolder is a standalone service with its own `package.json`, build, and deploy target.

## Layout

- `/web` — Next.js 14+ on Vercel. Owns React UI, all pages and API routes, Phaser canvas mount. Auth-gated via Supabase.
- `/game-server` — Colyseus 0.17+ on Railway. Owns avatar position sync, room presence, `UPDATE_LEVEL` broadcast. Redis-backed.

See `/docs/mvp/tad.md` §1.1 for the exact service-responsibility split and §2 for the locked stack.

## Conventions

- **Language:** TypeScript 5+ across every app.
- **Component / class files:** PascalCase (`AvatarController.ts`, `TavernChat.tsx`).
- **Module files:** kebab-case (`course-loader.ts`, `iso-math.ts`).
- **Tests:** colocated, `feature-name.test.ts` next to the file under test. Unit tests run in Vitest as part of CI (Phase 0 Week 2).
- **No direct Supabase queries from the game server.** The game server is presence-only; course / chat data lives on the web client via Supabase directly.
- **No direct Colyseus imports in `/apps/web` server-side code.** Client-side only, inside dynamically loaded Phaser scenes.

## What good looks like

- `/apps/web` and `/apps/game-server` can each be deployed independently and survive if the other is down (graceful degradation — the World still renders a static scene if Colyseus is unreachable).
- Shared types are imported from `/packages/shared`, never duplicated.
- Every feature maps back to a PRD section in `/docs/mvp/prd.md` and an architecture decision in `/docs/mvp/tad.md`.

## What to avoid

- Business logic in `/web` (UI layer) that belongs in a server API route.
- Running Phaser on the server — it depends on `window` / `canvas` / WebGL. Always `ssr: false` (see TAD §3.2).
- Introducing a new library without an ADR in `/planning/decisions`.
- Secrets, tokens, or keys committed anywhere under `/apps`.

## Tooling

**`/apps/web`**
- **Claude in Chrome MCP** (installed) — primary tool for exercising the rendered client.
- **Vercel MCP** (installed — ADR 0002) — preview URLs, env vars, build + runtime logs, deploy status.
- **Supabase MCP** (installed, `--read-only` — ADR 0002) — RLS checks, schema diffs, query inspection.
- **GitHub MCP** (installed — ADR 0002) — PR review and Actions logs for anything touching `/apps/web`.
- **Chrome DevTools MCP** (proposed) — frame-time and network profiling.
- **Playwright MCP** (proposed) — scripted E2E.
- **Cloudflare Stream MCP** (proposed) — upload / transcode status / signed URL generation. Install with Phase 3 Week 9.
- **Phaser scene skill** (proposed, via `skill-creator`) — scaffold new scenes with iso-math boilerplate.
- `/review` (installed) — before any PR merge.
- `/security-review` (installed) — **run before every merge that touches auth, RLS, tokens, API routes, or creator / member permissions.**

**`/apps/game-server`**
- **Claude in Chrome MCP** (installed) — open two tabs, drive both, verify presence and chat sync.
- **GitHub MCP** (installed — ADR 0002) — workflow runs for game-server CI + deploy status.
- **Railway MCP** (deferred per ADR 0002) — no mature community option. Use Railway dashboard + CLI until a viable MCP lands.
- **Realtime test harness skill** (proposed, via `skill-creator`) — codifies the multi-tab test pattern.
- `/review` (installed) — before any PR merge.
