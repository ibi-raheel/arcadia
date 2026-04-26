# Phase 13 — Sage as static welcome (rip AI, add flip cards)

**Date:** 2026-04-25
**Branch:** `feature/sage-static-welcome` → PR (TBD) → `main`
**ADRs:** [0017](../../planning/decisions/0017_2026-04-25_sage-static-welcome.md) (supersedes [0014](../../planning/decisions/0014_2026-04-25_sage-knowledge-base.md))

## What shipped

The bearded merchant in the upper-left of the central square (the
"Sage" / "wanderer") stopped being an AI guide. The proximity prompt
+ ENTER trigger that opens his popup is unchanged; what's *inside*
the popup is now a static welcome panel + four flip cards
introducing Arcadia's main neighbourhoods:

- **The Academy** — where members learn from your courses.
- **The Square** — the crossroads where every traveller passes.
- **The Tavern** — gather, chat, watch the leaderboard, follow the feed (also hosts livestreams / Q&As / AMAs). *(Was "Your Dashboard" until PR #39 — replaced because the dashboard is creator-only, the tavern is what every member uses.)*
- **The Coworking Grove** — a quiet tent for working alongside others.

Direction hints were also iterated post-ship in PR #41: Academy now points "north of the square, weave through the doors"; Coworking Grove now points "west from the square, enter any tent you like".

Each card has a front (sigil + label + tagline) and a back (2–3
sentences of body copy + a navigation hint). Click / Enter / Space
flips it. Esc and backdrop click dismiss the whole popup.

## Why

The Sage's job is "explain Arcadia to a new traveller." Two days
of running it as a Gemini-backed chat surfaced the right diagnosis:
this is essentially an FAQ, the answers don't change between users,
and an LLM call costs money + can fail. A team-authored static
surface is cheaper, more reliable, and gives the same first
impression. ADR 0017 captures the full reasoning.

## What was deleted

- `apps/web/app/api/sage/chat/route.ts` — the streaming Gemini
  endpoint.
- `apps/web/lib/sage/knowledge.ts` — the markdown corpus baker
  that read `/docs/mvp/*` + ADRs at server start.
- `apps/web/lib/sage/storage.ts` — localStorage chat history.
- `apps/web/lib/sage/__tests__/{prompts,storage}.test.ts` — chat
  test suites (16 cases, all retired).

## What was added

- `apps/web/components/scriptorium/FlipCard.tsx` — Y-axis CSS-3D
  flip wrapper. Caller picks the surface (Vellum, Scroll, …) for
  each face. Keyboard-accessible.
- `apps/web/lib/sage/cards.ts` — typed `SAGE_CARDS` const, four
  entries.
- `apps/web/lib/sage/__tests__/cards.test.ts` — 4 cases asserting
  card count, required-field presence, tagline length cap, single-
  char sigils.

## What was rewritten

- `apps/web/components/sage/SageDialogue.tsx` — wholesale rewrite.
  Same outer ScrollCard shell + Esc/backdrop dismiss + overlay-
  input focus bridge. Inside: header ("welcome, traveller"), 2×2
  flip-card grid, footer instruction line. No chat input, no
  streaming, no localStorage, no API calls.
- `apps/web/lib/sage/prompts.ts` — reduced to a single
  `SAGE_GREETING` constant.

## What was preserved

- `apps/web/components/sage/SageFeatures.tsx` — the React event
  bridge. Unchanged.
- `apps/web/components/game/scenes/square/SquareScene.ts` — the
  proximity-prompt + ENTER trigger fires `SQUARE_OPEN_SAGE_EVENT`
  exactly as before.
- `apps/web/components/game/scenes/square/layers.config.ts` —
  `SQUARE_NPC` coordinates unchanged.
- **`apps/web/lib/scribe/gateway.ts`** — the shared Gemini SDK
  boundary. The Scribe (course maker, Phase 10) still uses this for
  `/api/scribe/{outline,lesson,image}`. Sacred. Untouched.

## Cost / reliability impact

- Sage Gemini calls per opened popup: **was 1 per message**, now **0**.
- First-token latency to "I see content": **was ~600–1200 ms**,
  now ~0 (static render).
- API failure modes removed: rate-limit, model timeout, model
  refusal, partial stream.
- Scribe Gemini usage: unchanged.

## Tests + verification

Local runs all green:

- `npm run format:check` — clean.
- `npm run lint` — clean (`--max-warnings=0`).
- `npm run typecheck` — clean.
- `npm run test` — 313 passing (was 325 in Phase 12; net –12 from
  retiring the chat suites and adding `cards.test.ts`).
- `next build` — production compile succeeded; `/api/sage/chat` no
  longer in the route map.

Visual verification deferred to user (no browser MCP available in
this session): boot `/world`, walk to the bearded merchant in the
upper-left, press ENTER, confirm the welcome + 4 flip cards land
cleanly and that flipping a card reveals its back.
