# ADR 0011 — Route the Scribe's AI calls through the Vercel AI Gateway

**Date:** 2026-04-24
**Status:** Accepted
**Supersedes:** —
**Related:** Phase 10 plan (`phases/phase-10_plan.md`), ADR 0002 (MCP
wiring), ADR 0010 (sim-mode + fallback pattern)

## Context

Phase 10 introduces "the scribe" — a staged AI course maker on
`/dashboard/courses/conjure`. Each stage (outline → lesson body →
image) is a server action that streams a model response back to the
browser. The options:

1. **Anthropic SDK direct.** Install `@ai-sdk/anthropic` or the raw
   `@anthropic-ai/sdk`. Call Claude with an API key stored in
   `ANTHROPIC_API_KEY`.
2. **Vercel AI SDK + Gateway.** Install `ai` + `@ai-sdk/gateway`. Use
   provider strings like `"anthropic/claude-opus-4-7"`. One auth token
   (`AI_GATEWAY_API_KEY`), many providers available.
3. **LangChain or similar wrapper.** More indirection for no added
   value at Arcadia's scale.

## Decision

**Use the Vercel AI SDK v6 through the AI Gateway** (option 2).

Model picks per stage:

- **Outline** — `"anthropic/claude-opus-4-7"`. Structure-heavy,
  benefits from a strong model. Cost capped by tight prompt + short
  expected output.
- **Lesson body** — `"anthropic/claude-haiku-4-5"`. Bulk generation,
  one per lesson, cost-sensitive. Haiku's quality is enough for a
  draft the creator will revise.
- **Image** — picked per-image in 10.6; starts with Gateway's default
  image endpoint using a Flux-class model. Locked-style preamble
  ensures visual consistency.

## Rationale

Gateway gives us: one auth key, swappable models per stage without
code changes, native streaming wired into Next's `useCompletion` /
`streamText`, and observability + fallback out of the box. If
Anthropic rate-limits in the middle of a lesson generation, the
Gateway can retry or fall back to another provider without touching
our code.

Cost and latency are the real risks. Streaming addresses latency
(first token under 2 s per the phase exit criteria). For cost:
per-draft output-token budget (50k tokens soft cap per draft, hard
stop at 75k) enforced in `app/_actions/scribe.ts` before every
stream starts, plus a daily per-creator cap read from an env var
(`SCRIBE_DAILY_TOKEN_CAP`, default 500k). The token counter lives on
`course_drafts.tokens_used` (added in migration 10.1).

The Anthropic SDK direct path is a valid fallback if Gateway pricing
or reliability ever disappoints. Swap path: change `streamText({
model: 'anthropic/claude-opus-4-7' })` to `streamText({ model:
anthropic('claude-opus-4-7') })` using the direct provider import —
same call site, same streaming, just a different auth key.

## Consequences

**Good:**

- Provider-agnostic call sites — swap models by editing one string.
- Built-in streaming + the `useCompletion` hook on the client.
- One env var to manage (`AI_GATEWAY_API_KEY`).

**Watch out:**

- Gateway pricing tracks provider pricing with a small markup. Worth
  a read before the first billing cycle.
- Response shapes differ slightly from the direct Anthropic SDK; keep
  the prompt + parse layer confined to `lib/scribe/` so a future
  swap touches ≤ 3 files.
- Image model pick (10.6) is the one stage where Gateway abstraction
  leaks — different image endpoints have different request shapes.
  Keep a `lib/scribe/image.ts` thin wrapper so the rest of the app
  sees a single `generateImage(prompt, style) => url` surface.

## Alternatives considered

- **Anthropic SDK direct** — simpler per-request, but tying the whole
  scribe to one provider closes the door on cost-based swaps. Also
  harder to swap in a cheaper model for lesson bodies without
  installing a second SDK.
- **LangChain / LlamaIndex** — adds abstraction and a dependency
  upgrade treadmill for no feature we actually need. Our prompts are
  short, our stages are sequential, our context fits in Claude's 1M
  window directly (see ADR 0012).

## Implementation notes

1. Install: `npm i ai @ai-sdk/gateway` in `apps/web`. No per-provider
   package.
2. Env: add `AI_GATEWAY_API_KEY` to `apps/web/.env.local.example` and
   the Vercel project. Document in `ops/deploy/CONTEXT.md`.
3. Scribe actions in `app/_actions/scribe.ts` import from `ai` and
   use `streamText({ model: 'anthropic/claude-opus-4-7', ... })`.
4. Never call any provider SDK directly outside `lib/scribe/*` so the
   abstraction holds.
