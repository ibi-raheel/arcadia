# Workspace: Docs

## Purpose

API reference, user-facing guides, and the changelog. Written for two audiences: developers integrating with Arcadia, and creators / members using it.

## Layout

- `/mvp` — canonical MVP master documents: `prd.md`, `tad.md`, `phase-plan.md`. Source of truth for scope, architecture, and sequencing. Read first before any MVP work.
- `/api` — API reference, keyed to the server endpoints (future `/apps/web/api`).
- `/guides` — how-to docs for creators and members (kebab-case topic names, e.g. `creator-dashboard-guide.md`).
- `/changelog` — dated entries (`YYYY-MM-DD_change-summary.md`) for anything user-visible.

## Process

- API docs are updated alongside the code that changes them. If a change touches a route, it updates the API doc in the same phase.
- Guides are written when a feature ships — not before, not after.
- Changelog entries are written at the end of each phase. One file per notable change.

## What good looks like

- API docs match current behavior. No stale endpoints.
- Guides are short, task-oriented, screenshot-light.
- Changelog tells a creator or developer exactly what changed and whether they need to do anything.

## What to avoid

- Documenting features that are not yet built.
- Long, narrative guides. Keep them task-focused.
- Marketing language. Plain and factual.
- Duplicating content between `/api` and `/guides`. Link, don't copy.

## Tooling

- **`docx` skill** (installed) — export formatted Word versions of guides on demand (e.g. onboarding PDFs for partner creators).
- **`pdf` skill** (installed) — produce PDF versions of guides, or extract text from third-party PDF references.
- **API reference skill** (proposed, build via `skill-creator`) — generate `/docs/api` entries from server route definitions so docs don't drift from the code.
- **GitHub MCP** (proposed) — link changelog entries to the PRs / commits that shipped them.
