# ADR 0013 — Swap the Scribe from AI Gateway to Gemini direct

**Date:** 2026-04-25
**Status:** Accepted
**Supersedes:** Partially — the routing pattern in ADR 0011 (one
boundary module, provider-agnostic call sites) stands; the provider
choice flips from Gateway → direct Google Generative AI.
**Related:** ADR 0011 (original Gateway pick), Phase 10 plan.

## Context

ADR 0011 picked the Vercel AI Gateway so the scribe could swap models
per stage with one env var. In practice, when Phase 10 deployed:

1. The developer already held a Gemini API key from Google AI Studio.
   The Gateway expects its own `vck_...` keys; a raw Gemini key in
   `AI_GATEWAY_API_KEY` is rejected silently and every stream
   stalled at "~ ink warming ~".
2. Gemini 2.5 Flash Image (`gemini-2.5-flash-image-preview`) now
   supports native image generation via the standard Generative
   Language API — one key covers text + images. The Gateway's
   image path would have routed to Fal AI (Flux-schnell), requiring
   separate billing / account linkage.

Flipping to Gemini direct simplifies the ops story: one key, one
provider, text + images with the same auth.

## Decision

Route the scribe's LLM calls through **`@ai-sdk/google` directly**,
using Google Generative AI endpoints.

- Text (outline + lesson) → `gemini-2.5-pro` and `gemini-2.5-flash`.
- Image → `gemini-2.5-flash-image-preview` via `generateText` with
  `providerOptions.google.responseModalities = ['IMAGE']` — the
  image returns as a file part in `result.files`.
- Auth → `GOOGLE_GENERATIVE_AI_API_KEY` (replaces `AI_GATEWAY_API_KEY`).
- Streaming → unchanged. `streamText` from `ai` still works because
  `@ai-sdk/google` exposes standard LanguageModel instances.

## Rationale

**One key, one provider.** The developer in this project already had
Gemini set up; adding a Gateway key solely to translate to Gemini
later is unnecessary latency + a second billing account. Gemini 2.5
Flash Image closed the last gap — we no longer needed a separate
image provider.

**Gemini quality for this use case.** Gemini 2.5 Pro holds its own
on structured outline generation. Flash is fast + cheap for bulk
lesson bodies. Flash Image produces the warm illustrated style we
want (see `IMAGE_STYLE_PREAMBLE`) without the Imagen-on-Vertex auth
friction.

**The boundary still works.** `lib/scribe/gateway.ts` already hides
the provider from route code. Only that module plus the three route
handlers changed; no other file in the app imports the AI SDK.

## Consequences

**Good:**

- Single env var (`GOOGLE_GENERATIVE_AI_API_KEY`) for text + images.
- Images generate with the same key as text — no second account.
- `lib/scribe/gateway.ts` remains the one swap point if we ever
  flip back to the Gateway (or to Anthropic direct).

**Watch out:**

- Rate limits are Google-specific. If we outgrow the Gemini API's
  free tier, move to Vertex AI (paid) rather than re-adopting the
  Gateway — Gemini 2.5 Flash Image is more aligned with the
  scriptorium look than Fal AI's Flux.
- `gemini-2.5-flash-image-preview` is a preview model. If Google
  GAs it under a new ID, update `SCRIBE_MODEL_ID.image` in
  `lib/scribe/gateway.ts`.
- Image generation path is `generateText`, not
  `experimental_generateImage`. The difference is encapsulated in
  `app/api/scribe/image/route.ts`.

## Alternatives considered

- **Stay on the Gateway, issue a Gateway key.** Works but adds an
  extra Vercel product to the dependency graph and routes images
  through Flux when Gemini already supports native image gen for
  the same auth.
- **Anthropic direct.** Would require a separate image provider and
  an `@ai-sdk/anthropic` install. More providers for the same
  feature surface.
- **Imagen 3 via Vertex.** Needs GCP project + service-account
  auth — heavy for MVP scale.

## Implementation notes

1. Install `@ai-sdk/google`.
2. `lib/scribe/gateway.ts` exports `scribeLanguageModel(stage)`,
   `scribeImageModel()`, `scribeConfigured()`, `tokenBudget()`.
3. Route handlers call `streamText({ model: scribeLanguageModel(…),
   … })` for text and `generateText({ model: scribeImageModel(),
   providerOptions: { google: { responseModalities: ['IMAGE'] } } })`
   for images.
4. Env: `GOOGLE_GENERATIVE_AI_API_KEY` on all environments; old
   `AI_GATEWAY_API_KEY` can be unset.
