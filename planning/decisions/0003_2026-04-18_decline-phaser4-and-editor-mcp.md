# ADR 0003: Decline Phaser 4 upgrade and Phaser Editor MCP (for now)

- **Status:** Accepted
- **Date:** 2026-04-18
- **Deciders:** Arcadia build owner
- **Related:** ADR 0001 (locked stack — Phaser 3.88+)
- **Trigger:** Phaser 4.0.0 went GA on 2026-04-10 (8 days ago). Phaser simultaneously launched a paid "Phaser Editor" tier at $12/month that advertises "MCP support for AI tools." Question raised during Phase 1 planning: should we adopt either or both?

## Context

Arcadia's stack is locked to Phaser 3.88+ by ADR 0001. Two new options appeared in April 2026 that could plausibly affect that lock:

1. **Phaser 4.0.0** — GA 2026-04-10. Marketed as the flagship going forward; 3.x is now the maintenance track (last 3.x point release was v3.90.0 on 2025-05-23, ~11 months ago). The migration post (https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know) describes the upgrade as "a few hours of work" for most games.
2. **Phaser Editor MCP** — https://github.com/phaserjs/editor-mcp-server. ~35 tools exposing scene authoring, asset management (including Tiled `.tmj`), and editable-tilemap operations to an AI assistant. Bundled in the $12/mo Phaser Editor tier (not a separate SKU).

Research summary (2026-04-18) collected via the Claude Code MCP support audit and the Phaser Editor MCP + Phaser 4 research brief — raw findings held in conversation logs for that date; key load-bearing facts reproduced below.

## Decisions

### Decision 1: Do not upgrade to Phaser 4 during MVP

Stay on Phaser 3.88+ through all 6 MVP phases. ADR 0001's Phaser 3.88+ lock stands unchanged.

**Rationale:**

- **Timing.** Phaser 4.0.0 is 8 days old as of this decision. Even with a "few hours" migration, mid-MVP stack changes are exactly what ADR 0001 was written to prevent. The MVP's 12-week window has no room for an engine upgrade that isn't delivering a feature we need.
- **No feature in Phase 0–5 is Phaser-4-only.** The entire MVP (2.5D orthographic iso tilemaps, 2:1 iso sprites, Arcade Physics, y-sort, camera follow-lerp) is well within Phaser 3.88's envelope.
- **Breaking-change surface.** Phaser 4 removes the Spine plugin, restructures the WebGL pipeline into render nodes, unifies FX/mask into a filter system, drops `Mesh`/`Plane`, and removes `setTintFill()`. Our current stack doesn't use any of these — a safe upgrade path — but the migration work still has to be done, tested, and verified against the 60 FPS NFR. That's calendar cost for zero product gain.

**When to reopen this decision:**

- A Phase 0–5 feature becomes blocked on a Phaser-3 limitation that 4 fixes (nothing currently projected).
- Phaser 3.x maintenance stops shipping security/bugfix releases for > 6 months.
- Post-MVP (after Phase 5 ships), as a planned upgrade with time budgeted.

### Decision 2: Do not adopt the Phaser Editor or its MCP

Do not purchase the $12/mo Phaser Editor tier. Do not install the Phaser Editor MCP server. Continue authoring scenes as hand-coded TypeScript in `/apps/web/components/game/`.

**Rationale (this is the bigger decision — the MCP is shaped differently than the pricing page suggests):**

- **The MCP is a driver for the Phaser Editor v5 desktop app, not a standalone code generator.** Per its own README: *"This server connects with a running instance of the Phaser Editor v5 desktop application. All changes on the project are made through the Phaser Editor running instance."* Adopting it requires running the desktop editor during dev sessions and treating the editor's proprietary scene/asset-pack format as source-of-truth.
- **The MCP explicitly does not edit source code.** README: *"These tools are **not** intended for direct modification of your project's source code."* It edits the editor's scene files, not our TypeScript. Official guidance is to co-run Cursor / Claude Code for source-level work.
- **Workflow mismatch.** Our Phase 1 plan (`phases/phase-01_plan.md`) authors Phaser scenes as hand-coded TS with typed config files (`camera.config.ts`, `sprites.config.ts`, `layers.config.ts`) per scene — the pattern recorded in ADR 0004. Adopting the Phaser Editor would fork the source of truth between the editor's scene files and our TS files; we would either (a) check both into the repo and risk drift, or (b) regenerate TS from the editor's format and lose the config-driven shape.
- **Claude Code's MCP plumbing is not the bottleneck.** Claude Code's MCP support (stdio + streamable-HTTP + OAuth, tools/resources/prompts, per-project `.mcp.json`, tool search for large tool sets) is mature and ready. We simply don't have a workflow the Phaser Editor MCP accelerates.

**When to reopen this decision:**

- Scene authoring becomes painful enough that a visual editor is warranted (multiple complex interior scenes, or creator-authored scenes in V2's customisable-worlds path).
- A different Phaser-related MCP appears that targets hand-coded TS scenes specifically (Phaser-framework MCP separate from the editor). ADR 0001's "any new MCP install" protocol applies — open a successor ADR.
- V2 customisable-worlds work starts and an editor becomes part of the creator-tooling surface. Different product-level conversation; not a pure stack decision.

## Consequences

- **ADR 0001 stands unchanged.** Phaser 3.88+ remains the locked engine.
- **No change to Phase 1 (or later) plans.** `phases/phase-01_plan.md` was drafted with this decision pre-applied — the "Phaser 3.88 / hand-coded TS / per-scene folder" path is the baseline.
- **Zero net spend.** No $12/mo recurring cost; no extra MCP tool-budget overhead.
- **No workflow change.** Dev sessions continue as single-tool (Claude Code + hand-coded TS + Tiled for maps). No desktop-editor install required in `README.md` §Development.
- **Phaser 3 is now on a documented sunset.** Point-release velocity is low. If security issues emerge in 3.x, the fix may lag; this is accepted at the MVP scale. Budget a Phaser 4 migration as the first post-MVP polish item when the MVP ships.

## What this ADR does not cover

- This ADR is silent on **custom Arcadia-specific MCPs** (e.g. an MCP that scaffolds `WorldScene`-style TS files from a schema). That is a separate future decision — not blocked by this one — and would be its own ADR if pursued.
- This ADR does not preclude using **Claude Code's existing MCPs** (Vercel, GitHub, Supabase per ADR 0002) or the proposed Railway / Cloudflare Stream / Playwright / Sentry MCPs when their time comes.
