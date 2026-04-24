# ADR 0010: Design token wiring + simulation-mode persistence

- **Status:** Accepted
- **Date:** 2026-04-24
- **Deciders:** Arcadia build owner
- **Related:** Phase 8 plan (`phases/phase-08_plan.md`), ADR 0009 (`frontend-design` skill + `/design` workspace), obsolete `phases/phase-06_plan.md`

## Context

Phase 6 was reframed as "design delivery": the Arcadia Design System package (`design/kit/` in the repo, from `/Users/aria/Downloads/Arcadia/UI UX Design files/Claude Design - Arcadia/`) is the completed Phase-6 output — tokens, SVGs, 20 primitive previews, 5 surface UI kits.

Phase 8 is the production wire-up. Before any specific surface is rebuilt, two cross-cutting concerns have to land first:

1. **How design tokens (color, font, type scale, spacing, shadow) become available to every React component.** The kit's `colors_and_type.css` is the canonical source; the question is which runtime layer consumes it.
2. **How the "simulation" toggle flips any data-fetching surface from real Supabase data to hand-authored fixtures and back.** The toggle has to persist sensibly and be visible when on.

This ADR records both decisions so future sub-phases don't re-litigate them.

## Options considered — tokens

### A. CSS custom properties only (in `globals.css`)
Paste the full `:root { --night: ... }` block into `apps/web/app/globals.css`. Every component reads via `var(--token)`. No Tailwind wiring.

- **Rejected as sole approach.** Loses Tailwind utilities — `className="bg-vellum text-ink font-display"` is the shortest idiom for scaffolding UI quickly. Would force every surface to either hand-write style objects or use `className="bg-[var(--vellum)]"`, both worse than the utility syntax.

### B. Tailwind extension only
Extend `tailwind.config.ts` with the full palette and fontFamily. Skip CSS custom properties.

- **Rejected.** Runtime theming (e.g. a future light/dark toggle, or the `design/kit/preview/*.html` files that reference `var(--vellum)` directly) needs the custom properties. Also the semantic element styles in `colors_and_type.css` (`h1`-`h4`, `.caps`, `.kicker`, etc.) assume the vars exist.

### C. Both — CSS custom properties + Tailwind extension + `next/font` bindings (chosen)
Three layers, all consistent with each other:

1. `apps/web/app/globals.css` inlines the full `:root` block from the kit's `colors_and_type.css` (minus the Google Fonts `@import` — next/font handles that). Also inlines the semantic element styles (`h1`-`h4`, `.caps`, `.body`, `.hand`, `.mono`, `.kicker`).
2. `apps/web/app/layout.tsx` imports the six font families via `next/font/google` (IM Fell English, IM Fell English SC, EB Garamond, Cormorant Garamond, Caveat, JetBrains Mono). Each `.variable` output is bound to its `--font-*` CSS custom property; all six variables are attached to `<body>` so globals.css + Tailwind see them.
3. `apps/web/tailwind.config.ts` extends `theme.extend.colors` with every color token and `theme.extend.fontFamily` with the six family bindings. Also adds `borderRadius` (`hair`/`card`/`soft`/`pill`) and `boxShadow` (`page`/`lift`/`float`/`sunk`/`press`) presets.

## Decision — tokens

**Option C.** All three layers land together in Phase 8 sub-phase 8.0 step 2.

**Invariant:** The palette and font list in `design/kit/colors_and_type.css`, `apps/web/app/globals.css`, and `apps/web/tailwind.config.ts` must stay in sync. If a token is added to the design kit, add it to both globals.css (as a `--foo` custom property + semantic alias if applicable) and `tailwind.config.ts` (as a Tailwind utility key).

## Options considered — simulation persistence

### A. URL param only (`?sim=1`)
Read from `useSearchParams` / `req.url`. Clear on navigate unless the app preserves it.

- **Rejected.** Not sticky across a session. A developer or demo viewer flipping sim on would have to re-flip every page nav. Also clutters URLs.

### B. `localStorage` only
Read via a tiny helper; survives page loads + tab close + browser restart.

- **Rejected as sole approach.** Not shareable. If the builder wants to send a teammate a link that lands on the fixture-view of `/dashboard`, localStorage can't do that.

### C. Hybrid — `localStorage` source of truth + `?sim=1` URL override (chosen)
`?sim=1` (or `?sim=0`) on any URL forces that value for the current page load AND writes back to localStorage. Otherwise, read from localStorage. Default off.

- **Chosen.** Sticky for dev + demo; shareable for demo links.

### Visible indicator
Whenever sim mode is on, a lantern-yellow pill reading `◈ simulation` sits in the top-right corner of every page. Non-blocking, non-dismissable while sim is on. Clicking it toggles sim off.

## Decision — simulation persistence

**Option C** with the visible-indicator requirement baked in.

- `apps/web/lib/simulation-mode.ts` exports `isSimulationOn()` (SSR-safe; reads cookies on server, localStorage on client), `setSimulation(boolean)`, `useSimulationMode()` React hook.
- `apps/web/components/scriptorium/SimulationToggle.tsx` — a wax-styled toggle for the dashboard shell.
- `apps/web/components/scriptorium/SimulationBadge.tsx` — the top-right indicator, mounted at the layout level so it's visible on every page that opts in.
- `apps/web/lib/fetch-or-mock.ts` — `fetchOrMock(real, mock)` helper for server components and `useFetchOrMock(real, mock)` hook for client. Every data-fetching surface uses one or the other.

## Consequences

**Good**

- All three token layers are single-pasted-source: any color in the system can be reached from CSS vars OR Tailwind utilities OR inline `var()` calls. No surface has to choose.
- Simulation toggle works identically for a one-off demo link (URL) and a developer's sticky preference (localStorage). Visible indicator prevents fake-data-mistaken-for-real bugs.
- `fetchOrMock` / `useFetchOrMock` become the project-wide pattern for "can this surface be simulated?" — any new fetch either uses them or explicitly doesn't (e.g. raw Colyseus subscriptions which aren't "fetched").

**Neutral**

- Keeping three token layers in sync is an ongoing discipline — mitigated by the invariant above and the fact that the design kit is stable (refinement of v4.5, not a new direction).
- Six `next/font` imports increase the layout's JS surface slightly. `next/font` auto-subsets + self-hosts so the network cost is offset by fewer external font requests.

**Risks / watch-outs**

- **Cookie sync for SSR simulation**: the initial plan was localStorage + URL. Server components can't read localStorage, so `isSimulationOn()` on the server reads from a `sim` cookie that is mirrored from localStorage on client hydration. This introduces a flicker risk on first-load if the cookie and localStorage disagree. Mitigation: server always reads cookie; client hook reconciles on mount; visible indicator updates in both directions. Revisit if the flicker is noticeable.
- **Font loading performance**: six Google Fonts is a lot. `next/font` handles preload + subset. If LCP regresses by more than ~100 ms on `/dashboard`, consider dropping Cormorant Garamond (the rarely-used script face) first.

## Follow-ups

- Add a lint rule (custom ESLint rule or a CI script) to flag a new color hex literal in `apps/web/**` that isn't already in `tailwind.config.ts` or `globals.css`. Post-Phase-8.
- If a second design theme is ever wanted (light mode, alternate skin), the three-layer wiring is the scaffold to do it on — flip the `:root` vars, regenerate Tailwind from a different palette object.
