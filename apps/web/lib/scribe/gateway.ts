// Thin boundary around the Vercel AI Gateway. Per ADR 0011, call
// sites use provider strings like `"anthropic/claude-opus-4-7"` so
// swapping models is a one-string change.
//
// This module is the single place that reads the gateway env vars
// and translates our stage semantics into model picks. Nothing else
// in the codebase should import the `ai` package directly.

export type ScribeStage = 'outline' | 'lesson' | 'image';

/** Model picks per stage. Encoded in code so tests can assert the
 *  pairing without mocking the whole SDK. */
export const SCRIBE_MODEL: Record<ScribeStage, string> = {
  outline: 'anthropic/claude-opus-4-7',
  lesson: 'anthropic/claude-haiku-4-5',
  // Flux-schnell via the Gateway — fast, cheap, consistent style.
  // Swap to flux-1.1-pro in the ADR if quality becomes the ceiling.
  image: 'fal-ai/flux/schnell',
};

/** Hard per-draft budget. Above this, every streaming action returns
 *  { ok: false, error }. Falls back to 75k if the env var is missing. */
export function tokenBudget(): number {
  const fromEnv = Number(process.env.SCRIBE_TOKEN_BUDGET_PER_DRAFT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 75_000;
}

/** Returns true if `process.env.AI_GATEWAY_API_KEY` is set. When
 *  false, streaming routes short-circuit with a typed error so the
 *  UI can render a scribe's note instead of 500-ing. */
export function gatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}
