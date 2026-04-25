// Static greeting line for the wanderer's welcome surface.
//
// Phase 11 shipped a Gemini-backed chat (full system prompt + corpus
// here). Phase 13 retired that approach (ADR 0017) — the surface is
// now a static welcome + flip cards. This file kept only the greeting
// constant in case the dialogue ever wants a one-line opener again.

export const SAGE_GREETING = 'Welcome, traveller.';
