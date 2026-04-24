# 2026-04-25 · Phase 10 — the Scribe (AI course maker)

**Branch:** `feature/ai-course-maker` → `main`
**Plan:** `phases/phase-10_plan.md`
**Status:** `phases/phase-10_status.md`
**ADRs:** 0011 (Vercel AI Gateway), 0012 (source-doc storage + parse)
**Migrations:**

- `apps/web/supabase/migrations/20260425000001_phase10_course_drafts.sql`
- `apps/web/supabase/migrations/20260425000002_phase10_scribe_images_bucket.sql`

Shipped an AI-powered course maker that lives alongside the manual
course builder. Creator clicks **✦ conjure with the scribe** on
`/dashboard/courses`, drops source documents into the satchel,
writes a brief, and walks through four approvable stages — outline,
lessons, images, seal — each streaming live, each revisable without
losing earlier stages. On seal, the draft materializes into real
`courses` / `sections` / `lessons` rows and the creator lands on the
regular builder for polish.

## The ritual

0. **The satchel** — drag-drop PDFs / DOCX / TXT / markdown (up to
   5 files / 10 MB each / 600k parsed chars total). Files upload to
   a private `course-draft-sources` bucket, parse server-side (pdf-
   parse, mammoth, raw utf-8), and cache in `course_drafts.sources`
   jsonb. The brief textarea auto-saves debounced.
1. **Outline** — POST `/api/scribe/outline` streams a JSON outline
   from Claude Opus via the Vercel AI Gateway. The creator watches
   the scribble roll in, then lands on an editable form — inline
   title / section / lesson fields with a 600 ms debounced save.
   Approve advances stage; revise re-streams with a feedback note.
2. **Lessons** — One card per lesson. "Compose" streams markdown
   from Claude Haiku. Approve one by one, or "compose all · N
   left" runs them sequentially. Revise on any card re-streams
   that single lesson. When every lesson is approved, the backend
   auto-advances to the images stage.
3. **Images** — Thumbnail card + one card per lesson. "Generate"
   hits Flux-schnell via the Gateway through `experimental_generate
   Image`; every prompt is prefixed with a locked style preamble
   ("warm hand-inked illustration, vellum tones, sepia and verdigris
   accents…") so a single course reads as one bookshelf. Bytes
   land in the public `course-generated-images` bucket. Re-roll
   deletes the current image and re-opens the empty card; approve
   flips the flag. When thumbnail + every lesson image is approved,
   stage advances to `ready`.
4. **Seal** — Final summary (sections / lessons / images /
   thumbnail). One WaxButton → `sealDraft` server action writes
   one `courses` row + N sections + N×M lessons, then redirects to
   `/dashboard/courses/[newId]` for polish in the manual builder.
   Draft preserved with `stage='sealed'` + `sealed_course_id` for
   audit.

## Resume

`/dashboard/courses/conjure` runs `getOrCreateDraft` which returns
the creator's most-recent non-sealed draft or creates a fresh one.
`/dashboard/courses` queries the same table in parallel with its
course list and flips the ConjureLink copy to "resume the scribe"
plus a lantern-coloured "~ on the lessons ~" tag when a draft is in
progress.

## Data layer

- `course_drafts` table — the stage machine (stage check in the
  enum), user prompt, title, outline jsonb, sources jsonb, lessons
  jsonb, images jsonb, tokens_used, sealed_course_id FK, timestamps.
  Per-creator RLS (read/insert/update/delete scoped to
  `auth.uid()`; insert also gates on `user_has_creator_role()`).
  Updated-at trigger.
- `course-draft-sources` Storage bucket — private, 10 MB per file,
  PDF/DOCX/TXT/markdown whitelist, path
  `{creator_id}/{draft_id}/{filename}`, creator-only RLS.
- `course-generated-images` Storage bucket — public read, 5 MB per
  file, PNG/JPEG/WebP whitelist, path `{creator_id}/{draft_id}/
  {image_id}.{ext}`, creator-only write.

Both migrations applied to prod (`eqbzltiasmuckgsapkye`).

## Stack picks (ADR 0011)

| Stage | Model | Why |
|-------|-------|-----|
| Outline | `anthropic/claude-opus-4-7` | Structure-heavy, benefits from a strong model. Short output keeps cost small. |
| Lesson body | `anthropic/claude-haiku-4-5` | Bulk generation; quality enough for a revisable draft; cheap + fast. |
| Image | `fal-ai/flux/schnell` | Fast, cheap, style-coherent. Swap path to `flux-1.1-pro` documented. |

Everything flows through the Vercel AI Gateway — one auth key
(`AI_GATEWAY_API_KEY`), one abstraction boundary in
`lib/scribe/gateway.ts`. Per-draft output-token cap
(`SCRIBE_TOKEN_BUDGET_PER_DRAFT`, default 75k) hard-stops streaming
once exceeded.

## Prompts (ADR 0012)

- `buildSourceContext` — concatenates parsed source texts (with
  filename + char count headers) up to 600k chars, truncates
  gracefully, emits an "additional sources omitted" marker when the
  satchel outgrows the budget.
- `outlinePrompt`, `lessonPrompt`, `imagePrompt` — stage-specific
  templates sharing a single SCRIBE_SYSTEM persona ("warm, direct,
  a little old-fashioned, no emojis, no AI-preambles").
- `parseOutlineJson` — defensive parser that strips Claude's
  occasional markdown fences and throws a typed error on malformed
  JSON so the client can offer a revise.

19 vitest cases cover all four. 12 cases cover the draft stage
transitions.

## Routes added

- `/dashboard/courses/conjure` — the workbench (server component
  shell + client stages).
- `POST /api/scribe/outline` — streams outline JSON.
- `POST /api/scribe/lesson` — streams lesson body markdown.
- `POST /api/scribe/image` — generates + uploads + returns the
  image record.

## Server actions added (`app/_actions/scribe.ts`)

`getOrCreateDraft`, `updateDraftPrompt`, `uploadDraftSource`,
`removeDraftSource`, `reloadDraft`, `setDraftStage`,
`updateDraftOutline`, `setLessonApproved`, `setImageApproved`,
`deleteDraftImage`, `sealDraft`.

All return a discriminated `{ ok, value | error }` so the client can
surface errors without guessing.

## Components added

All under `apps/web/app/dashboard/courses/conjure/_components/`:

- `ConjureWorkbench` — outer client shell; routes between stages by
  `draft.stage`.
- `StageRibbon` — 5-step lantern-filled progress indicator.
- `Satchel` — drag-drop + picker + WaxSeal chips + char-budget bar
  + debounced brief textarea.
- `OutlineStage` — streaming ScrollCard → editable outline with
  inline title / section / lesson fields + approve / revise.
- `LessonsStage` — one card per lesson with queued / streaming /
  ready / approved modes; "compose all · N left" sequential
  compose.
- `ImagesStage` — thumbnail card + per-lesson grid with empty /
  pending / ready modes; woodcut shimmer while painting; re-roll +
  approve.
- `SealStage` — 4-stat summary + WaxButton; redirects to the
  manual builder on success.

## Commits

- `feat(phase10.0): ADR 0011 (AI Gateway) + ADR 0012 (sources strategy)`
- `feat(phase10.1): course_drafts table + storage bucket + draft types`
- `feat(phase10.2): the satchel — upload + parse source documents`
- `feat(phase10.3): scribe streaming infra — outline route + prompts`
- `feat(phase10.4): outline stage UI — live stream, edit, approve, revise`
- `feat(phase10.5): lessons stage — per-lesson compose, approve, revise`
- `feat(phase10.6): images stage — generation, approve, re-roll`
- `feat(phase10.7): seal — materialize draft into courses/sections/lessons`
- `feat(phase10.8): resume hint on the conjure button`

## Before the PR merges

The Vercel project needs `AI_GATEWAY_API_KEY` set. Without it, the
three scribe routes return `503 — AI Gateway is not configured on
this deploy` and the UI surfaces that as a crimson error line. The
token-budget env var (`SCRIBE_TOKEN_BUDGET_PER_DRAFT`) is optional
and defaults to 75k.

Both Phase-10 migrations are already applied to prod.

## Deferred

- Resume a mid-stream stage if the server restarts.
- Voice-dictated prompt.
- Per-lesson video generation (images only for now).
- Vector DB / RAG — not needed until creators upload larger source
  material than the 600k cap fits.
- "Teach-me-my-course" chatbot inside the academy (Phase 11+).
- Per-image citations ("drawn from notes.pdf, p.3") — the source
  context is already labelled, just needs a UI.
