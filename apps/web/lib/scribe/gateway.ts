// Thin boundary around the LLM provider the scribe uses. We started
// on the Vercel AI Gateway (ADR 0011) but swapped to Google's
// Generative AI API directly (ADR 0013, 2026-04-25) because it
// supports native image generation with the same key and the user
// already had a Gemini API key in hand.
//
// Every scribe route imports models from here — nothing else in the
// codebase should touch `@ai-sdk/google` directly.

import { google } from '@ai-sdk/google';

export type ScribeStage = 'outline' | 'lesson' | 'image';

/** Model IDs per stage. Kept in one place so a future swap is one
 *  edit. See ADR 0013 for the per-stage rationale. */
export const SCRIBE_MODEL_ID: Record<ScribeStage, string> = {
  outline: 'gemini-2.5-pro',
  lesson: 'gemini-2.5-flash',
  // Gemini 2.5 Flash Image supports native image generation with the
  // same GOOGLE_GENERATIVE_AI_API_KEY. Uses the generateText path
  // with responseModalities: ['IMAGE'] (see image route).
  image: 'gemini-2.5-flash-image-preview',
};

/** Resolve a language-model instance for a given stage. Thin enough
 *  that routes don't need to import `@ai-sdk/google` themselves. */
export function scribeLanguageModel(stage: 'outline' | 'lesson') {
  return google(SCRIBE_MODEL_ID[stage]);
}

/** Image generation uses Gemini via `generateText` with image
 *  response modality — the SDK returns the image as a file in the
 *  response, not through the dedicated experimental_generateImage
 *  path (which targets Imagen-on-Vertex and needs GCP auth). */
export function scribeImageModel() {
  return google(SCRIBE_MODEL_ID.image);
}

/** Hard per-draft token budget. Above this, streaming actions bail
 *  with a typed error. Falls back to 75k if the env var is missing. */
export function tokenBudget(): number {
  const fromEnv = Number(process.env.SCRIBE_TOKEN_BUDGET_PER_DRAFT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 75_000;
}

/** True when `GOOGLE_GENERATIVE_AI_API_KEY` is set. Routes short-
 *  circuit with a typed 503 when this is false so the UI renders a
 *  scribe's note instead of 500-ing. */
export function scribeConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}
