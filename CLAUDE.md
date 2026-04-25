# Identity

You are a technical assistant helping build Arcadia — a browser-based 2.5D isometric virtual world platform for content creators and their communities.

This project workspace is strictly for the **technical build**. Strategy, positioning, and business ideas are out of scope here.

## Rules

- **Work in phases, step by step.** Never jump ahead.
- **Before starting any phase or sub-phase, write a small plan.** Outline what you are about to do and how, then wait for confirmation before proceeding.
- **Test thoroughly after every step or feature.** Do not move on until the current step is verified working.

### Sub-phase ritual (codified 2026-04-24 · applies phase 10 onward)

Every phase breaks into numbered sub-phases (10.0, 10.1, …). For **each** sub-phase:

1. **Plan the sub-phase** — one short paragraph in `phase-NN_plan.md`: what lands, what files change, what the test criterion is.
2. **Implement** — only the files the sub-phase names. No drive-by refactors.
3. **Test** — run the narrowest check that proves it works (vitest for pure logic, a browser check for UI, a SQL query for migrations).
4. **Review** — report the diff summary + test result to the user in one short message. Wait for a go-ahead or feedback before moving to the next sub-phase.
5. **Commit** — one commit per sub-phase, message prefix `feat(phaseNN.M):` or `fix(phaseNN.M):`.
6. **Log** — append the sub-phase outcome to `phase-NN_status.md` (one line).

This applies to every phase from Phase 10 onward. If the user says "no need to review, keep going," collapse step 4 but still commit + log each sub-phase separately so the history stays readable.
- **Run the full CI pipeline locally before any push to a PR-tracked branch.** That means all four stages the GitHub Actions workflow runs: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npx vitest run` (from `apps/web`). Typecheck + vitest alone are not enough — prettier + eslint failures only surface in CI otherwise, and every commit after the miss stacks a red run (see 2026-04-24 hotfix `#13`).
- **Identify bugs immediately.** If something is broken, flag it clearly before continuing.
- **Identify wrong fundamental approaches.** If the current approach is architecturally or technically flawed, say so directly — do not patch over a bad foundation.
- **Research before acting.** If a technical decision requires knowledge of libraries, APIs, browser behavior, or platform constraints, verify it first. Never guess.
- **Ask clarifying questions** before making assumptions on ambiguous requirements.
- **When unsure, say so.** Do not fabricate answers.
- Write in plain, clear language — no filler.

## Tech stack (locked for MVP)

Locked via `/docs/mvp/tad.md` v1.1. Promote to an ADR in `/planning/decisions/` on first commit.

- **Web framework:** Next.js 14+ (Vercel)
- **Game engine:** Phaser 3 (3.88+), orthographic tilemaps with 2:1 iso-style sprites
- **Multiplayer:** Colyseus 0.16.x on Railway (Redis-backed) — pinned per ADR 0005 (0.17 server incompatible with 0.16 client on seat-reservation shape)
- **Backend / auth / DB / realtime:** Supabase (Postgres + RLS + Auth + Realtime + Storage)
- **Video delivery:** YouTube unlisted (MVP demo only — ADR 0006). CF Stream remains the post-MVP target; swap-back path documented in ADR 0006.
- **UI:** Tailwind CSS 3+
- **Language:** TypeScript 5+
- **Map authoring:** Tiled Map Editor (`.tmj` format)

Codebase layout (per TAD): monorepo with `/apps/web` (Next.js), `/apps/game-server` (Colyseus), `/packages/shared` (TypeScript types). The earlier `/src/*` placeholder has been retired.

## Workspaces

- `/phases` — Phase plans and status. First-class because work is phase-gated.
- `/planning` — Specs, architecture, decision records.
- `/apps` — Deployable applications: `/apps/web` (Next.js on Vercel), `/apps/game-server` (Colyseus on Railway).
- `/packages` — Shared code across apps: `/packages/shared` (types, constants, protocol definitions).
- `/design` — Frontend-designer workspace. Governs the look/feel/voice/motion of every React UI surface in `/apps/web` (NOT Phaser scenes). Has its own `CLAUDE.md` that auto-loads designer mode: `system/` (tokens, typography, surfaces, ornaments, motion, voice), `areas/<area>.md` (committed direction per surface), `reference/*.html` (canonical mockups). See ADR 0009.
- `/docs` — Canonical MVP docs (`/docs/mvp`), API docs, guides, changelog, and the art-order spec (`/docs/art`).
- `/ops` — Deploy, monitoring, scripts.

Always read the root `CONTEXT.md`, `REFERENCES.md`, and the three canonical MVP documents in `/docs/mvp/` first. Then read the `CONTEXT.md` of the workspace you are entering.

The MVP documents are the source of truth for scope, architecture, and sequencing:

- `/docs/mvp/prd.md` — product requirements (what the MVP does)
- `/docs/mvp/tad.md` — technical architecture (how it is built; schema; RLS; XP; level sync)
- `/docs/mvp/phase-plan.md` — 12-week phased build sequence

## Routing

| Task | Workspace | Read first | Tools |
|------|-----------|-----------|-------|
| Orient on the repo (status, live URLs, layout summary) | root | `README.md` + latest `phases/phase-NN_status.md` (current position) | — |
| **Pick the right `cd` for a task** (token efficiency) | `/docs/claude-scoping.md` | this file (routing table) + `docs/claude-scoping.md` cheat sheet | — |
| Understand MVP scope / architecture / sequence | `/docs/mvp` | the three `prd.md` / `tad.md` / `phase-plan.md` files | — |
| Plan a new phase or sub-phase | `/phases` | `phases/CONTEXT.md`, `/docs/mvp/phase-plan.md`, latest `phase-NN_plan.md`, recent ADRs in `/planning/decisions/` | — |
| Log phase progress | `/phases` | `phases/CONTEXT.md`, active `phase-NN_status.md` | — |
| Write a feature spec | `/planning/specs` *(empty — Phase 2+)* | `planning/CONTEXT.md`, related architecture docs | GitHub MCP |
| Write / update architecture doc | `/planning/architecture` | `planning/CONTEXT.md` | GitHub MCP; `pptx` if preparing a stakeholder deck |
| Record a technical decision (ADR) | `/planning/decisions` | `planning/CONTEXT.md`, related ADRs | GitHub MCP |
| **Set / update aesthetic direction for a React surface** | `/design/areas` | `design/CLAUDE.md`, existing `design/areas/<area>.md`, the canonical `design/reference/*.html` | `frontend-design:frontend-design` |
| **Update design-system primitives (tokens, typography, surfaces, ornaments, motion, voice)** | `/design/system` | `design/CLAUDE.md`, `design/system/tokens.md`, `design/reference/*.html` | `frontend-design:frontend-design` |
| Web client + API routes (Next.js — rendering, UI, auth, API) | `/apps/web` | `apps/CONTEXT.md`, `apps/web/.env.local.example`. **For React UI work: `design/CLAUDE.md` + the relevant `design/areas/<area>.md`.** | `frontend-design:frontend-design` (React UI work); Claude in Chrome MCP; Vercel MCP; Supabase MCP; GitHub MCP; `/review`; `/security-review`; Chrome DevTools + Playwright MCPs (proposed) |
| **Creator dashboard** (course builder, section/lesson CRUD, publish) | `/apps/web/app/dashboard` | `design/areas/dashboard.md` (aesthetic direction); `apps/web/app/dashboard/courses/[id]/actions.ts` (server actions), `validation.ts` (pure validators, Vitest-testable) | `frontend-design:frontend-design`; Supabase MCP (read-only); `/review` |
| **Academy** (Phaser hall + member course viewer) | `/apps/web/app/academy` and `/apps/web/components/game/scenes/academy/` | `design/areas/academy-viewer.md` (React viewer direction — NOT Phaser scenes); `apps/web/app/academy/page.tsx` (Phaser mount), `components/game/GameAcademy.tsx`, `scenes/academy/AcademyScene.ts`. Course viewer at `/academy/[courseId]` is React. | `frontend-design:frontend-design` (for the React course viewer only, NOT Phaser scenes); Supabase MCP (read-only); `/review` |
| **Market** (Phaser stall hall + course catalogue) | `/apps/web/app/market` and `/apps/web/components/game/scenes/market/` | `design/areas/market.md` (React `StallView` direction — NOT Phaser scenes); `apps/web/app/market/page.tsx` (Phaser mount), `components/game/GameMarket.tsx`, `scenes/market/MarketScene.ts`. Stall detail + enrol happen in the React `StallView` modal. | `frontend-design:frontend-design` (for the React `StallView` modal only, NOT Phaser scenes); Supabase MCP (read-only); `/review` |
| **Creator analytics** | `/apps/web/app/dashboard/courses/[id]/analytics` | `design/areas/analytics.md` (aesthetic direction — journal surface, hand-drawn ink-line charts, no default chart libs); `fetch.ts` (owner-verified service-role read), `aggregate.ts` (pure helper, unit-tested). Creator-only; 404 for non-owners. | `frontend-design:frontend-design`; Supabase MCP; `/review` |
| **World + outdoor scenes + coworking tents** (square, academy-outside, tavern-outside, coworking-outside, coworking-inside) | `/apps/web/components/game/scenes/{square,academy-outside,tavern-outside,coworking-outside,coworking-inside}` | each scene's `CLAUDE.md` + sibling `*.config.ts`; `components/game/scenes/shared/outdoor-scene-base.ts` for the three single-player outdoors. All image-backed; `square` + `coworking-inside` join Colyseus rooms that auto-shard at `maxClients=20`. See `docs/changelog/2026-04-22_image-backed-world.md`. | Claude in Chrome MCP (visual verify) |
| **Coworking productivity overlays** (Jukebox, Hourglass, Hearth pill, Pomodoro banner, Focus pill) | `/apps/web/components/coworking/` | `apps/web/components/coworking/CLAUDE.md`; server contract in `apps/game-server/src/rooms/realm-handlers.ts` (`applySetJukebox`, `applyStartPomodoro`, `applyStopPomodoro`, `tickPomodoro`); shared schemas in `packages/shared/src/schemas/{JukeboxState,PomodoroState}.ts`; `docs/changelog/2026-04-25_phase-12-coworking-productivity.md` for the full ship + ADR 0016. | `frontend-design:frontend-design` (React UI work); `/review` |
| **Persistent player HUD** (avatar badge top-left, XP bar + level shield top-right) | `/apps/web/components/hud/` | `apps/web/components/hud/PlayerHud.tsx` (orchestrator + Realtime XP subscription); `panel.css` (Kenney 9-slice border-image rules); `Shield.tsx` (inline SVG); ADR 0018 + `docs/changelog/2026-04-25_phase-14-player-hud.md`. Asset subset at `apps/web/public/hud/kenney/` (CC0). XP source: `progressToNextLevel(xp)` from `@arcadia/shared`. | `frontend-design:frontend-design` (React UI work); `/review` |
| **Phaser scene tweaks** (camera / sprites / layers / animations / input) | `/apps/web/components/game/scenes/<scene>` | that scene's `CLAUDE.md` + its `*.config.ts` files | Claude in Chrome MCP (visual verify) |
| **Art ingestion** (avatars / tilesets / maps — crop, place, register) | `/apps/web/public` (art-workstation CLAUDE.md) | `apps/web/public/CLAUDE.md` (the workstation), `scripts/{crop,upscale}-*.mjs`, `scripts/generate-world-tmj.mjs` | — |
| **Design the world map by hand in Tiled GUI** | Tiled desktop app (legacy — /world is now image-backed as of 2026-04-22, not Tiled-authored) | `docs/tiled-gui-quickstart.md` + ADR 0007 (the Tiled-authored square is preserved on disk in `app/world-square-v3/` but no longer routed) | Tiled (external app) |
| **Debug a broken dev server / bundler error** | `/apps/web` | `apps/web/components/game/CLAUDE.md` §Invariants (known gotchas: Phaser namespace import, `.next/` cache staleness) | — |
| **Deploy branch to Vercel preview** | `/apps/web` | `ops/deploy/` + `planning/decisions/0002_...md` | Vercel MCP; GitHub MCP |
| Game server (Colyseus — presence, avatar sync, room state) | `/apps/game-server` | `apps/CONTEXT.md` | Claude in Chrome MCP (two-tab manual tests); GitHub MCP; Railway MCP (proposed — deferred per ADR 0002); `/review` |
| Shared types / constants / protocol | `/packages/shared` | `packages/CONTEXT.md` | `/review`; GitHub MCP |
| API reference | `/docs/api` *(empty — Phase 3+)* | `docs/CONTEXT.md` | Custom `api-reference` skill via `skill-creator` (proposed) |
| Art assets / sprite requirements | `/docs/art` | `docs/art/sprite-requirements.md` | Art authored in-house by user; ingest via `scripts/crop-spritesheet.mjs` + `AVATAR_SHEETS` entry |
| Creator / member guides | `/docs/guides` *(empty — Phase 4+)* | `docs/CONTEXT.md` | `docx`; `pdf` |
| Changelog entry | `/docs/changelog` | `docs/CONTEXT.md` | GitHub MCP |
| Deploy config / CI | `/ops/deploy` | `ops/CONTEXT.md` | GitHub MCP; Vercel MCP (ADR 0002) |
| Monitoring / runbook | `/ops/monitoring` *(empty — Phase 5+)* | `ops/CONTEXT.md` | Sentry MCP; PagerDuty or Opsgenie MCP (all proposed) |
| Operational scripts | `/ops/scripts` | `ops/CONTEXT.md` | `schedule`; GitHub MCP |

## Naming conventions

- **Phase plans:** `phase-NN_plan.md` starting at `phase-00_plan.md` (Foundation). Six plans for the MVP core (`phase-00` through `phase-05`); extension phases (`phase-06` through `phase-14`) added 2026-04-22 onward as the build kept compounding past the original scope. Phase 12.A closed; Phase 13 (sage as static welcome — ADR 0017 supersedes 0014); Phase 14 (persistent player HUD — ADR 0018) all shipped 2026-04-25.
- **Phase status logs:** `phase-NN_status.md`
- **Feature specs:** `feature-name_spec.md` (kebab-case)
- **Architecture docs:** `topic.md` in `/planning/architecture/` (e.g. `rendering.md`, `realtime.md`, `data-model.md`, `auth.md`)
- **Decision records (ADR):** `NNNN_YYYY-MM-DD_decision-title.md` in `/planning/decisions/`. `NNNN` is a four-digit zero-padded sequence across ALL ADRs (0001, 0002, 0003, …); the date is the one the decision was made. Sequence number keeps chronological scan easy once there are 10+ ADRs; date keeps same-day ADRs distinguishable. Reference them in prose as "ADR 0001", "ADR 0002", etc.
- **Client components:** PascalCase files (`AvatarController.ts`, `TavernChat.tsx`)
- **Non-component modules:** kebab-case (`course-loader.ts`, `iso-math.ts`)
- **Tests:** colocated, `feature-name.test.ts` next to the file under test
- **Guides:** kebab-case topic (`creator-dashboard-guide.md`)
- **Changelog entries:** `YYYY-MM-DD_change-summary.md`

## Tooling (Layer 3)

This is the plug-and-play layer. Tools are wired into the workspaces above — they load only when the relevant task runs. Not everything listed is installed yet; some depend on stack decisions still pending an ADR.

### Skills — installed now

- `frontend-design:frontend-design` — distinctive, production-grade UI for React/Next.js work in `/apps/web`. Enforces bold aesthetic direction, characterful typography, cohesive color systems, high-impact motion. Avoids generic AI aesthetics (no Inter/Roboto/Arial, no purple-on-white gradients, no cookie-cutter layouts). **Auto-invoke for ANY React UI/UX work** — new components, page layouts, dashboards, modals, visual redesigns, or styling changes beyond trivial tweaks. **Skip for Phaser scenes** (`components/game/scenes/**`) — those are game rendering, not web UI.
- `docx` — export formatted Word guides from `/docs/guides`
- `pdf` — export or parse PDFs (guides, design references, third-party docs)
- `pptx` — architecture decks for stakeholder reviews (rare, `/planning/architecture` only)
- `xlsx` — data-model mocks, pricing matrices, CSV cleanup
- `schedule` — recurring operational jobs in `/ops/scripts`
- `skill-creator` — build custom Arcadia-specific skills (see proposed list below)
- `consolidate-memory` — reflective pass over memory/context files as they grow
- `setup-cowork` — Cowork onboarding helper (rarely needed after initial setup)

### Slash commands — installed now

- `/init` — regenerate or update `CLAUDE.md` as the codebase grows
- `/review` — PR review on the current branch
- `/security-review` — security review of pending changes. **Run before every merge that touches `/apps/web` server code, auth, or RLS policies.**

### Skills — proposed (build or install when needed)

- **Phaser scene scaffold skill** — create via `skill-creator` once the first scene lands in `/apps/web`. Encodes the iso-math setup, scene boilerplate, and asset load pattern.
- **Tiled map import skill** — create via `skill-creator` when map authoring starts. Converts a Tiled `.tmx` / `.json` export into Arcadia's internal map format.
- **Realtime test harness skill** — create via `skill-creator` when the realtime layer is real. Wraps Claude in Chrome MCP to open N tabs, connect them, and assert presence/chat behavior.
- **API reference skill** — create via `skill-creator` for `/docs/api`. Generates API docs from server route definitions.
- **Humanizer / doc co-authoring skills** (shown in the source video as GitHub community skills) — **skipped.** They are content-creator tools. Not relevant for Arcadia's technical build.

### MCPs — installed now

- **Claude in Chrome** — browser automation. Primary tool for exercising the client, running exploratory multiplayer tests (two tabs, both controlled), and debugging rendering issues.
- **Vercel MCP** (hosted, OAuth — ADR 0002) — deploy status, env var management, build/runtime logs, preview URLs. Drives all `/apps/web` deploy ops.
- **GitHub MCP** (stdio via `@modelcontextprotocol/server-github` + `gh` PAT — ADR 0002) — PRs, issues, Actions workflow runs, release tags. Fallback from the Copilot-gated hosted endpoint (see ADR 0002 for the rationale and the swap-back path).
- **Supabase MCP** (stdio via `@supabase/mcp-server-supabase` with `--read-only` — ADR 0002) — schema inspection, RLS policy checks, row counts, query execution. Write access is intentionally disabled; relaxing it requires a new ADR.
- **mcp-registry** — search the registry (`search_mcp_registry`) and suggest connectors (`suggest_connectors`).
- **plugins** — search plugin bundles (`search_plugins`) and install them (`suggest_plugin_install`).
- **scheduled-tasks** — create / list / update scheduled tasks for `/ops/scripts`.
- **cowork** — workspace helpers (file presentation, directory requests).
- **session_info** — read prior sessions; useful for carrying context across phases.
- **computer-use** — full-screen + app-switching automation. Used sparingly, primarily for native-app workflows not covered by other MCPs.

### MCPs — proposed (install as the stack comes online)

- **Railway MCP** — Colyseus deploy status, logs, env vars. **Deferred** per ADR 0002 — no sufficiently mature community MCP as of 2026-04-18. Use Railway dashboard + CLI until then.
- **Cloudflare Stream MCP** — video upload / transcode status / signed URL generation. **Deferred:** ADR 0006 picked YouTube unlisted for the Phase-3 demo; CF Stream swap-back is post-MVP. Install when we execute the swap.
- **Playwright MCP** — scripted E2E tests once the client has real routes.
- **Chrome DevTools MCP** — performance profiling (frame times, network) for rendering and realtime work.
- **Sentry MCP** — error tracking in prod.
- **PagerDuty MCP** or **Opsgenie MCP** — incident alerting (post-launch).
- **Figma MCP** — creator-dashboard UI references during design work.

### Plugins — action item

Before building out Layer 3 further, run `mcp__plugins__search_plugins` for: *Phaser / 2D game dev*, *Supabase + Next.js*, *browser testing*, *Playwright*. If a bundle covers several proposed MCPs cleanly, prefer the bundle over installing individual MCPs.

### Adding a new tool later

1. Open an ADR in `/planning/decisions` titled `YYYY-MM-DD_add-<tool-name>.md`.
2. Record: what it does, what it replaces (if anything), which workspaces reference it, what breaks without it.
3. Update the routing table above and the relevant workspace `CONTEXT.md`.
4. Commit.ÍÍ

## File-access rules

- Create new files only in the workspace the task belongs to.
- If a task spans workspaces, stop and flag it before creating files in more than one place.
- Never modify files in a workspace without reading that workspace's `CONTEXT.md` first.
- Never write secrets, keys, or tokens into any file in this repo.
