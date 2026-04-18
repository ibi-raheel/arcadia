# Workspace: Planning

## Purpose

Architecture, feature specs, and decision records. This is where the **how** and **why** are written before code is written in `/src`.

## What lives here

- `/specs` — feature specifications (`feature-name_spec.md`)
- `/architecture` — architecture docs by topic (`rendering.md`, `realtime.md`, `data-model.md`, `auth.md`, `course-delivery.md`, `gamification.md`, etc.)
- `/decisions` — Architecture Decision Records (ADRs), dated and titled: `YYYY-MM-DD_decision-title.md`

## Process

- **Specs** are written before a feature enters a phase. A spec defines scope, behavior, data, and edge cases. Every spec should map cleanly to phase steps.
- **Architecture docs** cover cross-cutting concerns: rendering, realtime protocol, data model, auth, payments. One file per topic. Updated as the system evolves.
- **Decision records** capture every meaningful technical choice. Short. Dated. Titled with the decision, not the question. Format: **Context → Options considered → Decision → Consequences.**

## ADRs on file

- **ADR 0001** (`2026-04-18_locked-stack.md`) — locks the full MVP stack: Next.js 14+, Phaser 3.88+, Colyseus 0.17+, Supabase, Cloudflare Stream, Tailwind 3+, TypeScript 5+, Tiled. Covers the original "early ADR" questions (rendering engine, realtime transport, backend platform, video delivery, language, monorepo layout) in one document.
- **ADR 0002** (`2026-04-18_add-vercel-github-supabase-mcps.md`) — promotes Vercel / GitHub / Supabase MCPs to installed. Railway MCP deferred.

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
