# Phase 13 Plan: Sage as Static Welcome (rip AI, add flip cards)

**Goal:** Replace the AI-backed Sage chat (Phase 11) with a static
welcome surface + four flip cards introducing Arcadia's main
neighbourhoods. The bearded merchant's proximity prompt + ENTER
trigger stays exactly the same; only what opens on the other side
changes. AI calls go away — no more recurring Gemini cost or
rate-limit risk for an essentially-FAQ surface.

**Branch:** `feature/sage-static-welcome` → PR against `main`.

## Why this scope

The Sage's job, in practice, is "explain Arcadia to a new
traveller." That doesn't need an LLM — every answer is the same,
the team can author it once, and the result will be more reliable
than a streamed model response. ADR 0017 (this phase) supersedes
ADR 0014 (the static knowledge corpus + LLM approach). ADR 0015
(React popup, not Phaser bubble) still stands — only the contents
of the popup change.

## What stays / what goes

**Stays:**
- `apps/web/components/sage/SageFeatures.tsx` — the React event
  bridge that listens for `SQUARE_OPEN_SAGE_EVENT`.
- `apps/web/components/game/scenes/square/SquareScene.ts` — the
  proximity prompt + ENTER trigger.
- `layers.config.ts` — `SQUARE_NPC` coordinates.
- `apps/web/lib/scribe/gateway.ts` — the shared Gemini SDK
  boundary (the Scribe still needs it). **Sacred. Do not touch.**

**Goes (ripped in 13.3):**
- `apps/web/app/api/sage/chat/route.ts` — the LLM endpoint.
- `apps/web/lib/sage/knowledge.ts` — the corpus baker.
- `apps/web/lib/sage/storage.ts` — localStorage chat history.
- `apps/web/lib/sage/__tests__/{prompts,storage}.test.ts` — the
  chat-specific tests.
- The streaming chat UI inside `SageDialogue.tsx`.

**Replaced:**
- `apps/web/components/sage/SageDialogue.tsx` is rewritten as a
  welcome panel + 4 flip cards.
- `apps/web/lib/sage/prompts.ts` reduces to a static `SAGE_GREETING`
  constant (kept for the welcome heading).

**New:**
- `apps/web/components/scriptorium/FlipCard.tsx` — the flip-card
  primitive (CSS 3D transform, click or hover to flip).
- `apps/web/lib/sage/cards.ts` — typed card definitions (id, label,
  sigil, tagline, body, hint).
- `apps/web/lib/sage/__tests__/cards.test.ts` — content shape
  assertion (4 cards, all required fields present, no empty
  strings).

## Sub-phases

### 13.0 — Plan + ADR + branch (this file)

- Branch `feature/sage-static-welcome` cut from `main`.
- `phases/phase-13_plan.md` (this file) + `phases/phase-13_status.md`.
- `planning/decisions/0017_2026-04-25_sage-static-welcome.md`
  superseding ADR 0014.

**Test:** files exist; ADR 0014 frontmatter updated to mark it
superseded.

### 13.1 — Card content + FlipCard primitive

- New `apps/web/components/scriptorium/FlipCard.tsx`. Two-sided
  surface that flips around the Y axis on click. Accepts `front`
  + `back` ReactNode props; uses the existing `VellumCard` /
  `ScrollCard` styling on each face. Keyboard-accessible
  (Enter / Space toggles flip; `aria-pressed` reflects state).
- New `apps/web/lib/sage/cards.ts` exporting a typed
  `SAGE_CARDS: SageCard[]` constant. Four entries:
  - **Academy** — where members learn from courses (study halls
    + per-course React viewer at `/academy/[id]`).
  - **Square** — central hub; meet other travellers; doorways to
    every neighbourhood.
  - **Dashboard** — creator workshop (course builder, the Scribe,
    events, analytics).
  - **Coworking** — quiet productivity grove (jukebox, hourglass,
    hearth pill, focus pill).
- Each card: `{ id, label, sigil, tagline, body, hint }`.
  - `sigil`: emoji or single character used as the "wax seal" on
    the front face.
  - `tagline`: ≤ 60 chars, shown on the front.
  - `body`: 2–3 short sentences, shown on the back.
  - `hint`: navigation cue (e.g. "Walk west from the square").
- Pure data; no rendering decisions in here.

**Test:** new vitest `cards.test.ts` asserts 4 cards present,
each has all six fields populated, taglines ≤ 60 chars.

### 13.2 — Rewrite `SageDialogue.tsx`

- Wholesale rewrite of the dialogue body. Same outer overlay
  shell + `ScrollCard` container so it lands in the same place,
  same dismiss behaviour (Esc / backdrop click).
- New layout:
  - **Header:** DropCap "W" + "Welcome, traveller" + a single
    line of Caveat hand-script: *"Quick directions for the
    realm."*
  - **Card grid:** 2×2 of `FlipCard`s, one per `SAGE_CARDS`
    entry. Front: sigil + label + tagline. Back: body + hint.
  - **Footer:** "Tap a scroll to flip it. Press Esc to leave."
    in JetBrains Mono, low contrast.
- No chat input. No localStorage. No API calls.
- Fits inside the existing modal sizing.

**Test:** the existing `SageFeatures` event-bridge test still
passes (open/close on event). Visual check by running `npm run
dev` and pressing ENTER near the Sage.

### 13.3 — Rip the AI code path

- Delete `apps/web/app/api/sage/chat/route.ts`.
- Delete `apps/web/lib/sage/knowledge.ts`.
- Delete `apps/web/lib/sage/storage.ts` (if it exists per the
  earlier explore).
- Reduce `apps/web/lib/sage/prompts.ts` to just
  `export const SAGE_GREETING = "Welcome, traveller."`. Remove
  `SAGE_SYSTEM_PERSONA` + `buildSageSystem`.
- Delete the corresponding test files
  (`__tests__/prompts.test.ts`, `__tests__/storage.test.ts`).

**Test:** `npm run lint` + `npm run typecheck` green; the build
still produces a valid page; no dangling imports.

### 13.4 — CI green + browser verify (user)

- Run all four CI stages locally: `format:check`, `lint`,
  `typecheck`, `test`. Must pass.
- Run `next build` to confirm production compile.
- Boot `npm run dev` once and load `/world`; ENTER near the
  Sage; verify the welcome + 4 flip cards land cleanly. **Cannot
  self-verify visually from this session — flag for user
  to confirm in browser.**

### 13.5 — Docs

- New changelog: `docs/changelog/2026-04-25_phase-13-sage-static-welcome.md`.
- README: add `· [Phase 13](docs/changelog/2026-04-25_phase-13-sage-static-welcome.md)`
  to Phase exit logs.
- Update the route note in the recent-activity section.

## Test criteria (phase-wide)

1. The Sage NPC's proximity prompt + ENTER still opens the
   popup (regression check on Phase 11 wiring).
2. The popup is the new welcome + 4 flip cards. No streaming.
   No chat input.
3. Each card flips when clicked / Enter / Space.
4. Esc and backdrop click dismiss.
5. No calls to `/api/sage/chat` from the client (route is
   deleted).
6. The Scribe (`/dashboard/courses/conjure`) still works — its
   three Gemini routes unaffected.
7. All four CI stages green.

## Out of scope

- Animations beyond the flip itself (no card-deal entry, no
  tilt-on-hover beyond the design system's standard surface
  hover).
- Per-creator customisation of cards.
- Mobile responsive sizing beyond what the existing modal
  already supports.
