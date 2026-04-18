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

## Expected early ADRs

These decisions should have an ADR on file before `/src` gets meaningful code:

- Rendering engine (Phaser.js vs alternative)
- Realtime transport (Socket.io vs Liveblocks vs Ably vs custom)
- Backend / auth / DB platform (Supabase vs Firebase vs self-hosted)
- Video delivery (Mux vs Cloudflare Stream)
- Language / build tooling (TypeScript assumed; confirm)
- Monorepo vs polyrepo

## What good looks like

- A spec maps cleanly to phase steps.
- An ADR exists for every library, protocol, or structural choice that was non-trivial.
- Architecture docs stay current — if the code has drifted, the doc is updated or the drift is flagged in the status log.

## What to avoid

- Writing specs for V2 features inside V1 planning.
- Skipping ADRs for "obvious" choices — later you'll forget why.
- Mixing strategy, positioning, or business framing into architecture docs. That is out of scope for this repo.

## Tooling

- **GitHub MCP** (proposed) — for linking ADRs and specs to the PRs, issues, or commits that implemented them.
- **`pptx` skill** (installed) — use only when an architecture doc needs a stakeholder-facing deck. Default output for this workspace is markdown.
- **`skill-creator`** (installed) — if a recurring planning pattern appears (e.g. a standard ADR template filler), bake it into a skill rather than rewriting it by hand each time.
- `/review` (installed) — when a spec or ADR is up for review as a PR.
