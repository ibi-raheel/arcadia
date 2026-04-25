# 2026-04-25 · Phase 11 — the Sage + UI legibility audit

**Branch:** `feature/sage-and-ui-audit` → `main`
**Plan:** `phases/phase-11_plan.md`
**Status:** `phases/phase-11_status.md`
**ADRs:** 0014 (knowledge base), 0015 (React popup, not Phaser)

The bearded merchant on the rug in the upper-left of the central
square was, until today, a random-tip dispenser. He's now an AI
guide. Walk near him, press ENTER, a scriptorium-styled chat popup
opens. Ask anything — "where do I publish a course?", "how does
the tavern feed work?", "what's a realm?", "why YouTube and not
CF Stream?" — and Gemini answers from a curated corpus of every
Arcadia doc, every ADR, the README, and recent changelogs.

Bundled with a deep UI legibility audit (sub-phase 11.6, see
status log for the per-surface diff).

## How it works

1. `SquareScene.ts` lost the Phaser bubble (`createNpcBubble` /
   `showRandomNpcTip` / `updateNpcBubble`) and the random-tip
   array in `layers.config.ts`. In their place: a
   `ProximityPromptManager` pointed at the NPC's body centre with
   the standard scriptorium pill ("Press ENTER to speak with the
   wanderer"). On ENTER it fires `SQUARE_OPEN_SAGE_EVENT` on the
   scene event bus.
2. `components/sage/SageFeatures.tsx` (mounted by `GameSquare`)
   listens for that event and opens `SageDialogue`.
3. `SageDialogue.tsx` is a full-overlay ScrollCard — DropCap "W",
   transcript with WaxSeal-on-vellum sage bubbles + bronze "?"
   user discs, VellumField input, WaxButton submit. Esc closes.
4. The submit POSTs to `/api/sage/chat` with the conversation
   history. The route streams Gemini's response token by token.
5. The route reads the cached corpus from `lib/sage/knowledge.ts`,
   wraps it inside the system message via `buildSageSystem`, and
   asks `streamText` to respond at temperature 0.4.
6. Conversation history persists in `localStorage` (`lib/sage/
   storage.ts`) — capped at 30 messages / 4000 chars each. A
   "forget the conversation" GhostButton in the dialogue footer
   wipes it.

## Knowledge base (ADR 0014)

`lib/sage/knowledge.ts`. Static corpus, no RAG. Reads a curated
allow-list of files at server start, concatenates them with `===
<filename> ===` headers, caches the result in module scope. 200k
char cap; oldest droppable entries (changelog + low-priority ADRs)
fall first if exceeded. Non-droppable: PRD, TAD, phase-plan,
README, ADR 0001.

The Vercel Functions runtime reuses instances under Fluid Compute,
so cold starts pay the read cost once and warm requests are free.

## Voice + boundary (ADR 0015 + persona)

`lib/sage/prompts.ts`:

- Addresses visitors as "traveller" by default.
- Plain-spoken, old-fashioned, no AI-preamble phrases ("Certainly!",
  "Here is…").
- Knowledge boundary: "the scrolls don't cover that, traveller —
  ask one of the keepers" when the corpus is silent.
- Refusal stance for off-topic asks: gently redirects.
- Caps replies under ~120 words by default.

## Files added

- `apps/web/app/api/sage/chat/route.ts`
- `apps/web/components/sage/SageFeatures.tsx`
- `apps/web/components/sage/SageDialogue.tsx`
- `apps/web/lib/sage/knowledge.ts`
- `apps/web/lib/sage/prompts.ts`
- `apps/web/lib/sage/storage.ts`
- `apps/web/lib/sage/__tests__/prompts.test.ts` — 9 cases
- `apps/web/lib/sage/__tests__/storage.test.ts` — 7 cases
- `planning/decisions/0014_2026-04-25_sage-knowledge-base.md`
- `planning/decisions/0015_2026-04-25_sage-react-popup-not-phaser.md`
- `phases/phase-11_plan.md`
- `phases/phase-11_status.md`
- This changelog

## Files removed / pruned

- `apps/web/components/game/scenes/square/SquareScene.ts` — the
  Phaser bubble code and its private fields.
- `apps/web/components/game/scenes/square/layers.config.ts` — the
  10-tip random-tip array (kept the NPC position + proximityPx).

## Commits

- `feat(phase11.0): plan + ADR 0014 (sage knowledge base) + ADR 0015 (React popup)`
- `feat(phase11.1): sage knowledge corpus + system prompt`
- `feat(phase11.2): /api/sage/chat — streamed conversation route`
- `feat(phase11.3): wanderer becomes an AI sage — React popup replaces Phaser bubble`
- `test(phase11.4): localStorage helpers — round-trip + cap + malformed-input cases`
- `docs(phase11.5): plan + status + changelog closeout`
- (11.6 commits land per-surface during the audit)

## Before this PR merges

- `GOOGLE_GENERATIVE_AI_API_KEY` is already on the Vercel project
  (set during Phase 10). The sage reuses it.
- The corpus is read from disk on first request — no migrations,
  no env-var changes needed beyond what's already set.
- Off-topic / jailbreak attempts: the system prompt politely
  refuses + brushes them off in character. No sensitive data is
  exposed.

## Deferred

- Voice / audio input.
- Per-user memory across sessions (currently localStorage only —
  same browser, same device).
- Sage as an animated Phaser sprite walking the square.
- Tool use (e.g. sage navigates the user to a course).
