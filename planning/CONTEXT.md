# Workspace: Planning

## Boundary with `/docs/mvp`

**`/docs/mvp/` is the authoritative source of truth for the MVP.** `prd.md`, `tad.md`, and `phase-plan.md` (v1.1) define what's being built, how, and in what order.

`/planning/` is this workspace — a working space for architecture docs (cross-cutting technical detail that doesn't belong in the MVP trio), feature specs (pre-code and post-ship), and ADRs (durable technical decisions).

**If anything here conflicts with `/docs/mvp/`, the MVP docs win.** Update the MVP doc, or open an ADR arguing why the MVP doc should change.

## Purpose

Architecture, feature specs, and decision records. This is where the **how** and **why** are written before code is written in `/apps` + `/packages`.

## What lives here

- `/specs` — feature specifications (`feature-name_spec.md`)
- `/architecture` — architecture docs by topic (`rendering.md`, `realtime.md`, `data-model.md`, `auth.md`, `course-delivery.md`, `gamification.md`, etc.)
- `/decisions` — Architecture Decision Records (ADRs). Filename: `NNNN_YYYY-MM-DD_decision-title.md`. `NNNN` is a four-digit zero-padded sequence across all ADRs; the date is when the decision was made. Reference in prose as "ADR 0001" etc.

## Process

- **Specs** are written before a feature enters a phase. A spec defines scope, behavior, data, and edge cases. Every spec should map cleanly to phase steps.
- **Architecture docs** cover cross-cutting concerns: rendering, realtime protocol, data model, auth, payments. One file per topic. Updated as the system evolves.
- **Decision records** capture every meaningful technical choice. Short. Dated. Titled with the decision, not the question. Format: **Context → Options considered → Decision → Consequences.**

## ADRs on file

- **ADR 0001** (`0001_2026-04-18_locked-stack.md`) — locks the full MVP stack: Next.js 14+, Phaser 3.88+, Colyseus 0.17+, Supabase, Cloudflare Stream, Tailwind 3+, TypeScript 5+, Tiled. Covers the original "early ADR" questions (rendering engine, realtime transport, backend platform, video delivery, language, monorepo layout) in one document. Includes a **2026-04-18 addendum** documenting the Node 22+ runtime floor discovered during the Phase 0 Railway deploy (Colyseus's `rou3` transitive dep is ESM-only, requires `require(esm)` support).
- **ADR 0002** (`0002_2026-04-18_add-vercel-github-supabase-mcps.md`) — promotes Vercel / GitHub / Supabase MCPs to installed. Railway MCP deferred.
- **ADR 0003** (`0003_2026-04-18_decline-phaser4-and-editor-mcp.md`) — decline the Phaser 4 upgrade (4.0.0 went GA 2026-04-10, 8 days before this decision) and the $12/mo Phaser Editor + its MCP for the MVP. Phaser 3.88+ lock from ADR 0001 stands. The Phaser Editor MCP is a desktop-app driver for the editor's proprietary scene format — wrong shape for our hand-coded TS workflow. Revisit both post-MVP.
- **ADR 0004** (`0004_2026-04-18_per-scene-folder-config-convention.md`) — every Phaser scene owns a folder under `apps/web/components/game/scenes/<scene>/` with scene class + typed `*.config.ts` files + `__tests__/` + per-scene `CLAUDE.md`. Scene classes never hardcode tweakable values (camera zoom, spawn tile, body offsets, fade durations — all in configs). Binding on Phase 1+ Phaser work. Academy and Market stay React-only (no Phaser scene).

## Architecture docs on file

- `architecture/rendering.md` — Phaser-on-Next.js rendering model (orthographic tilemap + iso-style sprites + y-sort). Captures the Phase 0 Step 19 spike design and the 60 FPS measurement protocol.

Future architecture docs land here as their phases start: `realtime.md` in Phase 2, `data-model.md` (optional companion to TAD §6) if the schema grows, `gamification.md` in Phase 5.

## Expected future ADRs

Open a new ADR whenever one of the following is decided or changes:

- Deploy-target details beyond what's in ADR 0001 (e.g. CDN, domain strategy, multi-region).
- Observability (Sentry, alerting routing).
- Any stack change that would amend ADR 0001 (model upgrade, engine swap, etc.).
- Any new MCP install (per the Adding a new tool later protocol in `CLAUDE.md`).

## What good looks like

- A spec maps cleanly to phase steps.
- An ADR exists for every library, protocol, or structural choice that was non-trivial.
- Architecture docs stay current — if the code has drifted, the doc is updated or the drift is flagged in the status log.

## What to avoid

- Writing specs for V2 features inside V1 planning.
- Skipping ADRs for "obvious" choices — later you'll forget why.
- Mixing strategy, positioning, or business framing into architecture docs. That is out of scope for this repo.

## Tooling

- **GitHub MCP** (installed — ADR 0002) — for linking ADRs and specs to the PRs, issues, or commits that implemented them.
- **`pptx` skill** (installed) — use only when an architecture doc needs a stakeholder-facing deck. Default output for this workspace is markdown.
- **`skill-creator`** (installed) — if a recurring planning pattern appears (e.g. a standard ADR template filler), bake it into a skill rather than rewriting it by hand each time.
- `/review` (installed) — when a spec or ADR is up for review as a PR.
