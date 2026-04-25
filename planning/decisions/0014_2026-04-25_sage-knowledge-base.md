# ADR 0014 — Sage knowledge base: static markdown corpus, no RAG

**Date:** 2026-04-25
**Status:** Accepted
**Related:** Phase 11 plan, ADR 0013 (Gemini direct)

## Context

The wanderer NPC (square, upper-left) becomes an AI guide who
answers any question about Arcadia. He needs to know: what Arcadia
is, what realms / academy / tavern / market / coworking are, how
courses + lessons work, what the scribe is, the keyboard shortcuts,
the publishing flow, etc.

Sources of truth:

- `/docs/mvp/prd.md` — what Arcadia does
- `/docs/mvp/tad.md` — how it's built (architecture + RLS + XP)
- `/docs/mvp/phase-plan.md` — sequencing
- `/planning/decisions/*.md` — every ADR, useful for "why is X this
  way?"
- Root `README.md` — the live status snapshot
- `/docs/changelog/*.md` — what shipped recently

## Decision

**Bake the knowledge into a single corpus string at server start.**
No vector DB. No retrieval pipeline. The `lib/sage/knowledge.ts`
module reads markdown files via `fs.promises.readFile` once per
function instance, concatenates them with `=== <filename> ===`
headers, and caches the result in module scope.

Cap: **200k chars** total. Truncate the oldest changelog entries
first if exceeded (phase-plan + ADRs + PRD + TAD are non-negotiable).

The corpus is passed in as the `system` field of every `streamText`
call from `/api/sage/chat`. Gemini 2.5 Flash's context window is
1M tokens; 200k chars ≈ 50k tokens; plenty of room for the
conversation transcript on top.

## Rationale

**Why static, not RAG.** Arcadia's docs are small (tens of pages)
and structured. The full corpus fits in Gemini's context. A vector
DB adds: an embedding pipeline, a query latency tax, a retrieval
quality risk (wrong chunks chosen), and an extra bill. None of
those buy us anything at this scale.

**Why server-start, not per-request.** Reading the markdown files
on every request is wasteful — they only change at deploy time.
Module-scope caching means cold starts pay the read cost once;
warm requests are free. Vercel's Fluid Compute reuses function
instances aggressively, so the warm path is the common path.

**Why no live edits.** Doc changes need a redeploy to land in the
sage's mouth. That's fine — docs are version-controlled and edits
ship with code anyway.

**Why Gemini Flash, not Pro.** Sage answers conversational
questions, not architecture-heavy ones. Flash is 5–10× cheaper and
plenty good at the persona + Q/A flow. ADR 0013 already pins the
provider.

## Consequences

**Good:**

- One module, one cache, no operational moving parts.
- Doc edits + code edits ship together; no out-of-band sync.
- Token cost is predictable (corpus is fixed; only chat history
  varies).

**Watch out:**

- 200k char cap is generous now, restrictive later. If we ever
  ship a per-creator-realm knowledge base (V2), we re-evaluate to
  RAG.
- A new doc must be added to `KNOWLEDGE_FILES` in `lib/sage/
  knowledge.ts` to be included. The list is curated, not glob-
  based, so a stray markdown file won't accidentally land in the
  sage's context (which keeps internal-only notes private).

## Alternatives considered

- **pgvector + per-paragraph chunking.** Too much infrastructure
  for too little payoff at this scale. Reconsider if the corpus
  goes past Gemini's 1M context (≈ 4 MB of text) or we ship
  per-creator knowledge bases.
- **Read on every request.** Dies on Vercel's cold-start latency
  budget; pure waste on warm requests.
- **Embed the corpus in the bundle as a TypeScript constant.**
  Tempting (no fs at runtime) but blows up the server bundle and
  means doc edits require rebuilding the constant.

## Implementation notes

1. `lib/sage/knowledge.ts` exports `getSageCorpus(): Promise<string>`.
   First call reads + concatenates + caches. All subsequent calls
   return the cached value.
2. `KNOWLEDGE_FILES` is the curated list of markdown paths,
   relative to repo root. Add new entries explicitly.
3. Each section is wrapped in `=== <filename> ===\n…\n` so the LLM
   can attribute facts.
4. Truncation strategy: if total > 200k chars, drop the oldest
   `/docs/changelog/*.md` entries (sorted by filename date prefix).
   Never drop PRD / TAD / phase-plan / ADRs.
