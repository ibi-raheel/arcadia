# ADR 0017 — Sage as a static welcome + flip cards (no LLM)

**Date:** 2026-04-25
**Status:** Accepted
**Supersedes:** [ADR 0014](0014_2026-04-25_sage-knowledge-base.md) (the static-corpus + Gemini Flash approach for the Sage)
**Related:** [ADR 0015](0015_2026-04-25_sage-react-popup-not-phaser.md) (React popup choice — still stands), Phase 11 plan, Phase 13 plan

## Context

Phase 11 shipped the Sage as an AI guide: walk near the bearded
merchant in the upper-left of the square, press ENTER, get a
streamed Gemini Flash response with the static `/docs/mvp/*` +
ADR corpus baked into the system prompt (ADR 0014). It worked.

Two days of use surfaced two problems:

1. **Recurring API cost** for what is essentially an FAQ. Every
   "what's the academy?" question costs a Gemini call. The
   answers don't change between users.
2. **Reliability.** LLM responses can drift, get rate-limited,
   or fail. A welcome screen failing is a worse first impression
   than a static page that always works.

The Sage's actual job is "explain Arcadia to a new traveller." A
team-authored static surface does that better than an LLM call.

## Decision

Replace the Sage's chat UI with a **static welcome panel + four
flip cards** introducing Arcadia's main neighbourhoods:
**Academy, Square, Tavern, Coworking** (post-decision PR #39 swapped the third card from Dashboard → Tavern; the dashboard is creator-only, so Tavern reaches every traveller). Each card has a front
(sigil + label + tagline) and a back (2–3 sentences + a
navigation hint). Click / Enter / Space flips the card.

Specifically:

- The proximity prompt + ENTER trigger on the bearded merchant
  stays exactly the same.
- The popup is still a React overlay (ADR 0015 still applies —
  this just changes the contents).
- The `/api/sage/chat` route is **deleted**. So is the knowledge
  corpus baker (`lib/sage/knowledge.ts`) and the localStorage
  chat history (`lib/sage/storage.ts`).
- Card content is a typed const in `apps/web/lib/sage/cards.ts`.
  Easy to edit, version-controlled, no migration.
- The `lib/scribe/gateway.ts` Gemini wiring is **untouched** —
  the Scribe still needs it for course generation.

## Consequences

**Good:**
- Zero API cost for the Sage. The Scribe's Gemini usage continues
  unchanged.
- Always-on. The welcome surface can never fail to render.
- Trivial to update copy: edit `cards.ts`, ship.
- Faster open — no streaming wait, no first-token latency.

**Bad:**
- The Sage stops being conversational. Travellers who'd want to
  ask "where do I sign up for X?" get a generic card instead.
  Mitigation: the four cards are tightly written; the dashboard
  card points at the creator workshop, the academy card at the
  learner flow, etc.
- The original Phase 11 corpus + prompt-tuning work is thrown
  away. Acceptable cost — it took ~1 day and didn't earn back the
  recurring spend.

**Neutral:**
- Future "ask me anything" interactions, if we want them, can
  return as a separate, clearly-scoped feature (e.g. a paid
  creator-side concierge), not as the welcome surface.

## Alternatives considered

1. **Keep the AI Sage but cache responses** — solves cost but
   not reliability. And the cache hit rate would be high enough
   that the LLM call stops earning its keep anyway.
2. **Smaller free model (no Gemini)** — still has the reliability
   risk, and the model selection / hosting work is more than the
   static UI we're going to ship instead.
3. **Markdown-only popup with no flip animation** — less
   discoverable. The flip is the affordance: it tells you the
   front is a summary and there's more behind it. Worth the
   small extra build cost.

## Implementation

Tracked under Phase 13 (`phases/phase-13_plan.md`). Sub-phases
13.0–13.5 cover plan + content + UI rewrite + AI rip + docs.
