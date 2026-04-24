# ADR 0009: Add `frontend-design` skill and `/design` workspace

- **Status:** Accepted
- **Date:** 2026-04-23
- **Deciders:** Arcadia build owner
- **Related:** Root `CLAUDE.md` (Skills + Routing); `design/CLAUDE.md` (role); ADR 0004 (per-scene Phaser convention — explicitly excluded from this ADR's scope)

## Context

Arcadia's v4.5 design direction ("midnight scriptorium") has solidified into a full HTML reference: a lantern-lit desk with papers, scrolls, ledgers, envelopes, journals, and map cards — distinctive enough that every future React UI surface (creator dashboard, academy course viewer, market stall modal, creator analytics) must be designed AGAINST this direction rather than improvised per-session.

Two friction points were showing up:

1. **No installed skill for design quality.** The Vercel plugin gave us `shadcn`, `react-best-practices`, and `nextjs` — good for mechanics, silent on aesthetics. UI produced by an unprompted Claude session tended to generic AI defaults (Inter, purple gradients, centered white cards) — the exact failure mode the v4.5 direction was created to avoid.
2. **No durable home for the design direction.** Palette, typography, surface primitives, and the lexicon (doorway / host / hub / the kit) existed in a single HTML file parked in a local-agent session output folder. That file would be lost on session cache clear, and even if kept, there was no process for committing area-specific direction or reviewing what shipped.

## Options considered

### A. Skill only, no workspace
Install `frontend-design:frontend-design`, document it in root `CLAUDE.md`. Leave design direction in scattered references.

- **Rejected:** keeps the direction undocumented. The skill auto-triggers but has no project-specific direction to read — it would generate on-brand *generic distinctive* UI, not on-brand *scriptorium* UI.

### B. Nested `/docs/design/`
Sibling of `/docs/art/` under `/docs`. Lighter footprint.

- **Rejected:** mixes a working surface (committed design decisions, reviews) with documentation. `/docs` is described in its CONTEXT.md as API reference + user guides + changelog — not active design state. Area files would update often; docs drift rarely.

### C. Top-level `/design/` with dedicated `CLAUDE.md` (chosen)
Mirrors the first-class-workspace pattern (`/phases`, `/planning`, `/apps`, `/docs`, `/ops`). The CLAUDE.md auto-loads when Claude operates in the directory, shifting the session into frontend-designer mode.

- **Chosen.** Tradeoff: adds a 7th root workspace. Judged worth it because design direction needs to live close to working state (area files, review logs), and the `CLAUDE.md`-per-directory pattern is how Arcadia already scopes roles (see per-scene CLAUDE.md files under `apps/web/components/game/scenes/*/`).

## Decision

### 1. Install the `frontend-design:frontend-design` skill (user scope)

Installed from marketplace `claude-plugins-official` on 2026-04-23. Author: Anthropic (Prithvi Rajasekaran, Alexander Bricken). Backed by the [Frontend Aesthetics Cookbook](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb).

**Auto-invoke** (per the skill's own description-based trigger and reinforced in root CLAUDE.md) for any React UI/UX work: components, pages, layouts, modals, visual redesigns, or styling changes beyond trivial tweaks.

**Explicitly skip for** `apps/web/components/game/scenes/**` — those are Phaser scenes governed by ADR 0004's per-scene CLAUDE.md files. Game rendering and React UI have disjoint aesthetic rules; the skill's "distinctive web interfaces" framing would produce noise if applied to a tilemap scene.

### 2. Create `/design/` as a top-level workspace

Layout:

```
/design/
├── CLAUDE.md           # designer role (auto-loads in this dir)
├── CONTEXT.md          # workspace orientation (matches /phases, /planning, etc.)
├── system/
│   ├── tokens.md       # color + font tokens
│   ├── typography.md   # font roles, pairings, drop caps
│   ├── surfaces.md     # the six paper primitives
│   ├── ornaments.md    # hardware, seals, medallions
│   ├── motion.md       # sway, rotations, hover, focus
│   └── voice.md        # lexicon and copy voice
├── areas/              # committed direction per React surface
│   ├── dashboard.md
│   ├── academy-viewer.md
│   ├── market.md
│   └── analytics.md
├── reference/          # canonical HTML mockups (source-of-truth)
│   └── 2026-04-23_v4.5-scriptorium-01-design-system.html
└── reviews/            # YYYY-MM-DD_<surface>.md post-ship reviews
```

### 3. Binding rules (codified in `design/CLAUDE.md`)

1. Before touching React UI anywhere in `/apps/web`: read the relevant `design/areas/<surface>.md`.
2. If no area file exists, write one first. Wait for confirmation. Then build.
3. `system/tokens.md` is the palette; no new colors without updating it.
4. Fonts locked to the six in `system/typography.md`: IM Fell English, IM Fell English SC, EB Garamond, Cormorant Garamond, Caveat, JetBrains Mono. No Inter, Roboto, Arial, system-ui.
5. Every card is one of the six surface primitives in `system/surfaces.md`. No flat untextured rectangles.
6. Phaser scenes are out of scope — handled by their own per-scene CLAUDE.md (ADR 0004).

### 4. Root `CLAUDE.md` updates

- Add `/design` to the Workspaces list.
- Add two routing rows for the workspace itself (design system primitives / per-area direction).
- Add a pointer from every UI-heavy routing row to `design/areas/<area>.md` for context.

### 5. v4.5 theme preservation

The source HTML provided by the build owner is copied into `design/reference/2026-04-23_v4.5-scriptorium-01-design-system.html`. When the text docs in `design/system/*` disagree with this HTML, the HTML wins until reconciled in a follow-up ADR or a new `reference/*.html`.

## Consequences

**Good**

- Every React UI PR can cite a specific area file it implements, and a specific reference HTML it was measured against.
- New sessions automatically load designer context when working in `/design/` or following routing-table pointers to it.
- Drift between "intended design" and "shipped UI" has a surface to live on (`reviews/`) rather than being argued from memory.
- The v4.5 HTML reference survives session-cache clears.

**Neutral**

- Adds one root workspace. The repo top-level count goes from six to seven.
- Sub-CLAUDE.md files don't auto-load across directories, so the root CLAUDE.md routing table must continue to point at `design/areas/<area>.md` explicitly for `/apps/web` work.

**Risks / watch-outs**

- **Area-file staleness.** If the area files aren't updated when directions change, they drift from reality. Mitigation: the `CLAUDE.md` workflow step 6 ("Append a dated note to `areas/<area>.md` describing what shipped") is binding.
- **Token wiring in `/apps/web` is still to-do.** `design/system/tokens.md` documents the CSS custom properties and Tailwind plumbing approach; actual integration (globals.css + next/font + tailwind.config) will land in the first phase that builds a real surface. Track that work there, not here.
- **Skill and workspace can drift apart.** The skill's description auto-triggers based on user phrasing; it can't read the `/design/` workspace. The `design/CLAUDE.md` is what keeps both aligned — if we install a newer / different aesthetic skill later, update the CLAUDE.md and this ADR.

## Follow-ups (out of scope for this ADR)

- Wire tokens into `apps/web/app/globals.css` + `next/font` + `tailwind.config.ts`. First phase that designs a real surface.
- Write `areas/doorway.md` (login) and `areas/hub.md` (home) when those surfaces enter a phase.
- When a second HTML reference drops (e.g. `02-login.html`, `03-creator-dashboard.html`), copy it into `design/reference/` and cross-link from the relevant area file.
- Evaluate whether Playwright MCP (currently "proposed") should ship alongside this to visually snapshot `/apps/web` pages against `design/reference/*.html`.
