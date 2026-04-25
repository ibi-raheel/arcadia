# Phase 11 — Status

Source plan: `phase-11_plan.md`. Entries chronological, newest on top.

## 2026-04-25 — 11.5 · docs

- `docs/changelog/2026-04-25_phase-11-sage-and-ui-audit.md`.
- This status file.

## 2026-04-25 — 11.4 · localStorage tests

- 7 vitest cases on `lib/sage/storage.ts`: round-trip, empty,
  malformed JSON, bad-shape filtering, 30-message cap, 4000-char
  per-message cap, empty-array clears storage. 16 sage tests
  total, 282 overall.

## 2026-04-25 — 11.3 · sage popup landed

- Phaser bubble removed; `SquareScene` now uses a
  `ProximityPromptManager` pointing at the NPC's body centre.
  ENTER fires `SQUARE_OPEN_SAGE_EVENT`.
- React `SageDialogue` overlay (DropCap, transcript, streaming
  bubble, VellumField input, WaxButton submit, "forget the
  conversation" footer button).
- `SageFeatures` mounted in GameSquare via the standard game-event
  pattern.

## 2026-04-25 — 11.2 · /api/sage/chat route

- POST endpoint streams Gemini Flash responses via `streamText`.
- 503 if the LLM key isn't configured (reuses scribeConfigured).
- Validates roles + clips per-message + caps at 30 turns.

## 2026-04-25 — 11.1 · knowledge corpus + persona

- `lib/sage/knowledge.ts` reads + caches a curated allow-list of
  markdown files (PRD, TAD, phase-plan, README, key ADRs, recent
  changelog) into a single corpus string. 200k char cap with
  deterministic drop strategy.
- `lib/sage/prompts.ts` — SAGE_SYSTEM_PERSONA voice +
  buildSageSystem(corpus) wrapper + SAGE_GREETING.
- 9 vitest cases.

## 2026-04-25 — 11.0 · ADRs landed

- ADR 0014: sage knowledge as a static corpus baked at server
  start, no RAG.
- ADR 0015: chat surface is a React popup, not a Phaser bubble —
  same pattern as the tavern feed / academy ledger / market
  catalog.

## 2026-04-25 — Phase 11 opened

Branch `feature/sage-and-ui-audit` cut from `main`. Plan + status
files in place. Sub-phase ritual from CLAUDE.md applies.
