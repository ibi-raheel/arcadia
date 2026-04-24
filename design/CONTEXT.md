# Workspace: Design

## Purpose

Arcadia's frontend-designer workspace. Governs the look, feel, voice, and motion of every React UI surface in `/apps/web`. Does NOT govern Phaser scenes (`apps/web/components/game/scenes/**`) — those are game rendering, governed by per-scene CLAUDE.md files.

Added 2026-04-23 alongside the `frontend-design:frontend-design` skill (ADR 0009). Current theme: **v4.5 · midnight scriptorium**.

## What lives here

- `CLAUDE.md` — designer role + invocation rules + anti-rules + workflow (auto-loads when you work in this dir)
- `system/` — design-system primitives
  - `tokens.md` · `typography.md` · `surfaces.md` · `ornaments.md` · `motion.md` · `voice.md`
- `areas/` — committed aesthetic direction per React surface (`dashboard.md`, `academy-viewer.md`, `market.md`, `analytics.md`; add more as surfaces ship)
- `reference/` — canonical HTML mockups. The source-of-truth when text docs disagree.
- `reviews/` — post-implementation design reviews (`YYYY-MM-DD_<surface>.md`)

## Process

1. Before touching React UI anywhere in `/apps/web`: read the relevant `areas/<surface>.md`.
2. If no area file exists, write one first (Purpose / Mood / Signature moves / Primitives used / Copy voice). Stop, wait for confirmation, then build.
3. When a design decision is committed (palette pick, surface choice, motion style), record it in the appropriate `system/` or `areas/` file so future sessions inherit it.
4. After a surface ships, write a review in `reviews/` covering what worked, what didn't, and what to fold back into `system/`.

## What good looks like

- A new designer could open `system/` + `areas/<surface>.md` and produce on-brand UI without extra guidance.
- The HTML references in `reference/` and the text docs agree. When they drift, reconcile in a new `reference/*.html` or ADR.
- Every surface has a named voice (scroll / vellum / ledger / envelope / journal / map) — not "a card".
- Every React UI PR cites which area file it implements.

## What to avoid

- Writing design docs BEFORE a real surface is being designed. Speculative design rots.
- Inventing new tokens or fonts inline in TSX. Update `system/tokens.md` or `system/typography.md` first.
- Treating `reference/*.html` as a one-off mockup to be discarded. It's canonical.
- Cross-polluting with Phaser scene styling — game rendering rules live in the per-scene CLAUDE.md files.

## Tooling

- **`frontend-design:frontend-design` skill** (installed per ADR 0009) — auto-invoke for React UI work.
- **Claude in Chrome MCP** — visual verification against `reference/*.html` and the built UI.
- **`/review`** — review React UI PRs with this workspace's rules in hand.

## Cross-references

- Root `CLAUDE.md` routes the UI-heavy rows here.
- `/docs/mvp/prd.md` defines WHAT each surface does; this workspace defines HOW it looks and feels.
- `/docs/art/` handles in-world Phaser art (sprites, tilesets) — do not confuse with React UI design.
