# Phase 10 Plan: AI Course Maker (the scribe)

**Goal:** A creator on `/dashboard/courses` clicks **+ conjure with the
scribe**, drops source documents into a "satchel," and walks through a
staged draft ritual — outline → lesson bodies → images → seal — each
stage approvable / revisable, streaming live, consistent with the
scriptorium voice. Output is a real course row (sections + lessons +
thumbnails) landed in the same tables the manual builder writes to, so
the creator can still polish it in the existing `/dashboard/courses/
[id]` builder.

**Branch:** `feature/ai-course-maker` → PR against `main`.

## Why staged over one-shot

A single "generate my course" prompt is fast but produces mediocre
output that's hard to edit after. The staged ritual (satchel → outline
→ lessons → images → seal) keeps the creator in the loop at every
step, matches the scriptorium aesthetic (scrolls + wax seals +
approvals), and lets a bad lesson be revised without redoing the
course.

## Sub-phases

### 10.0 — ADR + stack pick (no code beyond the ADR)

- ADR 0011: Vercel AI Gateway vs direct Anthropic SDK. Recommend
  **Gateway** via AI SDK v6 for: unified provider string (`anthropic/
  claude-opus-4-7`), streaming, observability, swappable model per
  stage, image-gen support. Fallback path documented.
- ADR 0012: doc-upload & parsing strategy. Recommend Supabase Storage
  bucket `course-draft-sources` with creator-only RLS + server-side
  PDF / DOCX / TXT parsing into a `sources` jsonb column on a new
  `course_drafts` table. No vector DB — Claude's 1M context window
  fits typical creator source material without RAG.
- **Test:** two ADRs merged, nothing else.

### 10.1 — Migration + types

- New migration `20260425000001_phase10_course_drafts.sql`:
  - `course_drafts` (id, creator_id, realm_id, title nullable,
    user_prompt text, stage text check in (satchel, outline, lessons,
    images, ready, sealed), outline jsonb default '[]', sources jsonb
    default '[]', lessons jsonb default '[]', images jsonb default
    '[]', sealed_course_id uuid nullable references courses, created_at,
    updated_at).
  - Supabase Storage bucket `course-draft-sources` via migration SQL.
  - RLS: creator-only read + write on both table and bucket.
- Generate + check TS types into `apps/web/lib/types/database.ts`.
- **Test:** migration applies; `list_tables` + `list_extensions` MCP
  confirm table + policies live. One vitest for stage-state
  transitions added in 10.3.

### 10.2 — The satchel (upload UI + parse)

- Route `/dashboard/courses/conjure` (client component).
- Button `+ conjure with the scribe` added to `/dashboard/courses`
  header row next to `+ new course` (BronzeButton, same size).
- VellumCard titled "the satchel." Drag-drop + file chooser. Accepts
  PDF, DOCX, TXT (<= 10 MB each, 5 files max per draft).
- Upload path: client → server action `uploadDraftSource(draftId, file)`
  → Supabase Storage → server-side parse (`pdf-parse` for PDF,
  `mammoth` for DOCX, raw read for TXT) → append `{id, filename,
  char_count, text}` to `course_drafts.sources` jsonb.
- Each uploaded doc shows as a Chip with a WaxSeal + filename +
  "× remove." Progress bar during upload.
- **Test:** upload a 2-page PDF, a DOCX, a TXT; confirm rows parse
  and appear as chips. Remove one; confirm it's gone.

### 10.3 — Scribe action layer + streaming infra

- `app/_actions/scribe.ts` — server actions using Vercel AI SDK v6:
  - `startDraft(userPrompt)` → creates `course_drafts` row, returns id.
  - `streamOutline(draftId)` → streams outline JSON chunks; writes
    final outline to `course_drafts.outline` when stream closes.
  - `streamLesson(draftId, sectionId, lessonId)` → streams lesson
    body markdown; writes on close.
  - `generateImage(draftId, target)` → non-streaming, target is
    `'thumbnail' | {sectionId, lessonId}`. Uses a locked style preamble.
  - `reviseOutline(draftId, feedback)` / `reviseLesson(...)` — re-run
    with the user's revise feedback appended.
  - `sealDraft(draftId)` → materializes `courses` + `sections` +
    `lessons` + `lesson_images`; sets `stage='sealed'` + stores the
    new course id on the draft.
- Pure helper `lib/scribe/prompts.ts` — prompt templates per stage.
  Vitest: prompt assembly + token-budget guard.
- **Test:** 6+ vitest cases green; a scratch server action invocation
  returns a streamed outline against a fixture prompt.

### 10.4 — Stage 1: outline generation UI

- `/dashboard/courses/conjure` renders the current stage. On satchel
  done + user_prompt set, creator clicks **ask the scribe**.
- ScrollCard streams the outline in real time (section titles +
  lesson titles) with a typewriter ink-fade effect. Approve button
  locks the outline and advances stage to `lessons`. Revise button
  opens a VellumField "~ what should change ~" and re-streams on
  submit.
- **Test:** scribe drafts an outline from a prompt + one source;
  approve moves to next stage; revise re-streams.

### 10.5 — Stage 2: lesson bodies

- For each lesson in the outline, a LessonCard (VellumCard inside a
  section group). Status chip per lesson: `queued` | `streaming` |
  `ready` | `approved`.
- Creator clicks **compose** on a lesson → streams the body markdown
  into the card. Approve marks it approved. Revise opens the same
  feedback field + re-streams.
- "Compose all queued" runs them sequentially (1 concurrent to keep
  streams orderly + rate-limit friendly).
- Advance to `images` stage only when all lessons are approved.
- **Test:** compose a 3-lesson course; revise one; approve all;
  stage advances.

### 10.6 — Stage 3: images

- ImageCard per lesson + a separate thumbnail card.
- Fixed style preamble: `"warm hand-inked illustration, vellum
  tones, sepia and verdigris accents, subtle texture, soft diffuse
  light, no text, no borders, isometric not required"`. Concatenated
  with a per-image prompt derived from the lesson title + first
  paragraph.
- Generate button → loading shimmer → image appears. Approve stores
  URL on the draft. Revise opens a prompt-edit field + re-runs.
- **Test:** thumbnail + 3 lesson images generated; style reads
  consistent across all 4; approve + revise both work.

### 10.7 — Stage 4: seal

- A final ScrollCard: "seal the course." Shows a summary (section
  count, lesson count, image count). **Seal the course** button →
  `sealDraft` server action → creator lands on
  `/dashboard/courses/[newCourseId]` in the regular builder.
- Draft row preserved with `stage='sealed'` + `sealed_course_id` set
  for auditing.
- **Test:** seal a 3-lesson draft; verify `courses`, `sections`,
  `lessons` rows created; creator sees the course in the manual
  builder with all content intact.

### 10.8 — Resume + list

- If a creator has a draft with `stage != 'sealed'`, the `+ conjure
  with the scribe` button on `/dashboard/courses` shows a small
  "~ 1 draft in progress ~" hint and clicks into that draft instead
  of starting a fresh one.
- A "drafts" accordion below the courses list shows incomplete
  drafts with stage chips. Click resumes.
- **Test:** start a draft, navigate away, return → resume lands on
  the correct stage.

### 10.9 — Docs + exit

- `phases/phase-10_status.md` running log (already kept per
  sub-phase).
- `docs/changelog/2026-04-25_phase-10-ai-course-maker.md` full
  phase-exit write-up.
- ADR 0011 + ADR 0012 merged (landed in 10.0).
- Root `README.md` gets a Phase-10 line.
- Memory: nothing personal to save (no new user preferences).

## Test criteria (phase-wide)

1. A creator can go from `+ conjure with the scribe` to a published
   course (manual builder "publish" button) in under 10 minutes.
2. Every stage streams; no stage blocks for more than 2 s before the
   first token.
3. Revise at any stage re-streams without losing earlier stages.
4. Images across a single course look visually consistent.
5. 5-stage CI green (format / lint / typecheck / vitest / next
   build).
6. Sealed course appears in `/dashboard/courses` and renders in
   `/academy` like any manually authored course.

## Risks / unknowns

- **Cost.** Uncapped generation could burn dollars. Mitigation:
  per-draft token budget (e.g. 50k output tokens) + per-creator
  daily cap (configurable). Budget check in every streaming action.
- **Image provider.** Gateway supports multiple image models. Pick
  one in 10.0 ADR; locked-style prompt tested in 10.6.
- **Draft storage bloat.** Source texts can be big. Keep under 2 MB
  total per draft (hard cap at upload time). Drafts are per-creator
  ephemeral — fine for MVP scale.
- **RLS on storage bucket.** Easy to get wrong. Write an explicit
  integration test in 10.2 that asserts a different creator cannot
  list / download another creator's satchel files.

## Deferred (do not implement in Phase 10)

- Resume mid-stream if a server restarts.
- Voice-dictated prompt.
- Per-lesson video generation (images only).
- Vector DB / RAG (not needed until creators upload > 500 KB per
  source).
- "Teach-me-my-course" chatbot inside the academy (would be Phase
  11+).
