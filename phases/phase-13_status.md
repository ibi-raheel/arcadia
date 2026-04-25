# Phase 13 — Status

Source plan: `phase-13_plan.md`. Entries chronological, newest on top.

## 2026-04-25 — 13.5 · docs (changelog + README + phase-plan banner)

- New `docs/changelog/2026-04-25_phase-13-sage-static-welcome.md`
  with the full ship report (what shipped / why / what was deleted /
  what was preserved / cost-reliability impact).
- README: Phase exit logs row gets `· [Phase 13]` link; intro line
  bumps "five extension phases" → "seven" and notes the AI Sage was
  retired in Phase 13; "The Sage" feature row renamed to "The
  Wanderer (Phase 11 → revised Phase 13)" with the new behaviour.
- `docs/mvp/phase-plan.md` banner: bullet for Phase 13 added; Phase
  11's bullet annotated with the retire-in-13 note; "six" → "seven"
  extension phases.
- `CLAUDE.md` naming-convention bullet: extension-phase range
  bumped from 06–12 to 06–13.

## 2026-04-25 — 13.4 · CI green + production build green

- `npm run format:check` clean.
- `npm run lint` clean (`--max-warnings=0`).
- `npm run typecheck` clean.
- `npm run test` 313 passing (down from 325; net –12 from retiring
  16 chat tests and adding 4 cards tests).
- `next build` succeeded; `/api/sage/chat` no longer in the route
  map.
- Visual verification deferred to user (no browser MCP this
  session): boot `/world`, walk to the bearded merchant in the
  upper-left, ENTER, confirm welcome + 4 flip cards land cleanly.

## 2026-04-25 — 13.3 · ripped AI route + knowledge corpus + chat history

- DELETE `apps/web/app/api/sage/chat/route.ts`.
- DELETE `apps/web/lib/sage/knowledge.ts`.
- DELETE `apps/web/lib/sage/storage.ts`.
- DELETE `apps/web/lib/sage/__tests__/{prompts,storage}.test.ts`.
- `apps/web/lib/sage/prompts.ts` reduced to a single
  `SAGE_GREETING` constant. `SAGE_SYSTEM_PERSONA` and
  `buildSageSystem` removed.
- Scribe (`lib/scribe/gateway.ts` + `/api/scribe/*`) untouched.

## 2026-04-25 — 13.2 · SageDialogue rewritten as welcome + flip-card grid

- Same outer ScrollCard shell + Esc/backdrop dismiss + overlay-
  input focus bridge. Inside: header ("welcome, traveller"), 2×2
  grid of FlipCards built from `SAGE_CARDS`, footer instruction
  line.
- Each card uses `VellumCard` for both faces. Front: `WaxSeal`
  sigil + label + tagline (centred). Back: label + body prose +
  Caveat hand hint.
- No chat input, no streaming, no localStorage, no API calls.

## 2026-04-25 — 13.1 · card data + FlipCard primitive

- `apps/web/lib/sage/cards.ts` — typed `SAGE_CARDS: SageCard[]`
  const, four entries (academy / square / dashboard / coworking)
  with sigil + label + tagline + body + hint. Pure data; no
  rendering.
- `apps/web/components/scriptorium/FlipCard.tsx` — Y-axis CSS-3D
  flip wrapper. Caller picks the surface for each face (Vellum,
  Scroll, …). Click / Enter / Space toggles; `aria-pressed`
  reflects state.
- `scriptorium/index.ts` — barrel re-export of `FlipCard`.
- 4 vitest cases asserting card count, required-field presence,
  tagline length cap (≤ 60 chars), single-char sigils.

## 2026-04-25 — Phase 13 opened

Branch `feature/sage-static-welcome` cut from `main`. Plan +
status files in place. ADR 0017 supersedes ADR 0014 (the static
knowledge corpus + Gemini Flash approach for the Sage). ADR 0015
(React popup, not Phaser bubble) still stands — only the popup
contents change. Sub-phase ritual from CLAUDE.md applies; this
feature opted into autonomous mode (no per-sub-phase review,
commits + log entries continue).
