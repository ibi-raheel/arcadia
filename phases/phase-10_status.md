# Phase 10 — Status

Source plan: `phase-10_plan.md`. Entries chronological, newest on top.
Per the sub-phase ritual in root `CLAUDE.md`: one line per sub-phase
as it lands.

## 2026-04-25 — 10.12 · final docs + merge

- `phases/phase-10_plan.md` updated with 10.10 + 10.11 (post-hoc
  sub-phases) + this entry as 10.12.
- `docs/changelog/2026-04-25_phase-10-ai-course-maker.md` updated
  with every post-initial-PR change.
- Root README Phase-10 line expanded to cover the scribe's memory,
  TipTap editor, Gemini swap.

## 2026-04-25 — 10.11 · scriptorium editor (TipTap)

- Replaced `@uiw/react-md-editor` split-pane with a TipTap-based
  WYSIWYG surface. StarterKit + Link + Placeholder + tiptap-markdown.
- Five toolbar groups (headings, marks, lists, code/link, history).
- Editor CSS re-uses `.scriptorium-prose` rules — what you edit IS
  what the academy viewer renders.
- Content still round-trips as markdown; DB + academy untouched.

## 2026-04-25 — 10.10 · scribe's memory

- Migration `20260425000003` applied: `creator_preferences` table
  (voice_guide, image_style, audience) per-creator RLS.
- `ScribeMemory` collapsible LedgerCard at top of conjure workbench.
- Preferences injected into outline / lesson / image prompts via
  `lib/scribe/preferences.ts`. 4 new vitest cases — 250 total.

## 2026-04-25 — image gen hotfixes

- Gemini 2.5 Flash Image preview deprecated on v1beta → swapped
  image model to Imagen 4 Fast (`imagen-4.0-fast-generate-001`) via
  `google.image()` + `experimental_generateImage`. Same Gemini
  API key, dedicated endpoint.
- Image card "re-roll" now opens an inline "what should change?"
  field and re-runs generation with the feedback appended to the
  prompt. Prompt used is shown in a collapsible mono panel so the
  creator can see what was sent.

## 2026-04-25 — stage-transition + approve hotfixes

- Loosened `canAdvance` to allow any stage skip (forward or back);
  only staying on the same stage is rejected. Covers the legitimate
  satchel → lessons jump the outline route performs.
- Approve callbacks (outline + lesson + image) now reloadDraft on
  success so server-side stage auto-advances surface in the client
  immediately. Surfaces errors in crimson hand-script lines instead
  of silent no-ops.

## 2026-04-25 — provider swap: Gateway → Gemini direct (ADR 0013)

- Swapped from Vercel AI Gateway to Google's Generative AI API
  directly. One env var (`GOOGLE_GENERATIVE_AI_API_KEY`) covers
  text + images. SCRIBE_MODEL_ID per stage: gemini-2.5-pro (outline)
  / gemini-2.5-flash (lesson) / imagen-4.0-fast-generate-001 (image).

## 2026-04-25 — 10.9 · docs + PR

- Changelog `docs/changelog/2026-04-25_phase-10-ai-course-maker.md`.
- Root README Phase-10 line added.
- Phase 10 exit criteria met:
  - ✅ Creator can go from satchel → sealed course in one session.
  - ✅ Every stage streams; first token under 2 s when AI Gateway
    is reachable.
  - ✅ Revise at any stage re-streams without losing earlier stages.
  - ✅ Images share a single locked style preamble.
  - ✅ Sealed course appears in /dashboard/courses and renders in
    /academy like any manually authored course.
  - ✅ 5-stage CI green (format / lint / typecheck / vitest /
    next build).

## 2026-04-25 — 10.8 · resume hint landed

- /dashboard/courses queries course_drafts in parallel and passes
  the active draft stage to the ConjureLink button so it flips
  copy ("conjure" → "resume") + shows a "~ on the lessons ~" tag.
- Resume-by-default already worked via getOrCreateDraft.

## 2026-04-25 — 10.7 · seal landed

- `sealDraft` server action materializes course_drafts → courses +
  sections + lessons via the admin client (ownership re-checked
  first). Thumbnail image becomes courses.thumbnail_url; lesson
  images are prepended as markdown image lines.
- SealStage card with 4-stat summary + one WaxButton; on success,
  redirects to /dashboard/courses/[newId] for polish in the manual
  builder.
- Draft preserved with stage='sealed' + sealed_course_id.
- All CI + `next build` green.

## 2026-04-25 — 10.6 · images landed

- Migration `20260425000002` applied: `course-generated-images`
  bucket (public read, 5 MB, PNG/JPEG/WebP, creator-only write).
- `/api/scribe/image` route: uses experimental_generateImage with
  fal-ai/flux/schnell via the Gateway, uploads bytes to Storage,
  writes jsonb entry with public URL.
- ImagesStage: thumbnail card + per-lesson grid, all flowing through
  IMAGE_STYLE_PREAMBLE. Re-roll + approve + auto-advance to `ready`
  when everything's approved.
- Gateway SCRIBE_MODEL.image mapped to Flux-schnell.
- All CI + `next build` green.

## 2026-04-25 — 10.5 · lessons UI landed

- `/api/scribe/lesson` route streams markdown body per lesson;
  persists to `course_drafts.lessons` jsonb with approved=false.
- LessonsStage renders 4-state cards (queued / streaming / ready /
  approved) per lesson with compose + approve + revise controls.
- "compose all · N left" runs streams sequentially.
- `setLessonApproved` server action; auto-advances stage to `images`
  when every outline lesson is approved.
- All CI + `next build` green.

## 2026-04-25 — 10.4 · outline UI landed

- OutlineStage component with live streaming card (mono JSON
  scroller) + editable outline form + approve / revise flow.
- Inline title + section + lesson title editing with a debounced
  auto-save (600 ms) hitting updateDraftOutline.
- Revise re-streams with the feedback note appended to the route
  body. Abort on unmount prevents zombie fetches.
- Wired into ConjureWorkbench below Satchel; downstream stage
  placeholders updated.
- Four CI stages + `next build` green.

## 2026-04-25 — 10.3 · streaming infra landed

- AI SDK v5 + zod installed. `lib/scribe/gateway.ts` boundary holds
  the provider strings + token-budget + gateway-configured check.
- `lib/scribe/prompts.ts` — SCRIBE_SYSTEM persona, buildSourceContext
  (ADR 0012 budget), outline / lesson / image prompts, defensive
  parseOutlineJson that strips Claude's markdown fences. 19 vitest
  cases green.
- `/api/scribe/outline` route handler streams Claude's JSON; on
  close, parses + writes outline + title + advances stage, with
  graceful degradation when the gateway is unset or parse fails.
- Extra actions: reloadDraft, setDraftStage (guarded by canAdvance),
  updateDraftOutline.
- `.env.local.example` gets AI_GATEWAY_API_KEY + token-budget knob.
- All CI + `next build` green.

## 2026-04-25 — 10.2 · satchel landed

- `/dashboard/courses/conjure` route wired + server-component resume.
- Satchel UI (drag-drop + picker + chips + budget bar + brief).
- Scribe server actions: getOrCreateDraft, updateDraftPrompt,
  uploadDraftSource, removeDraftSource. Sequential upload per
  ADR 0012; 5 files / 10 MB each / 600k char total.
- `pdf-parse` (v2 class API) + `mammoth` installed and wired in
  `lib/scribe/parse.ts`. Normalisation collapses BOM + CRLF + blanks.
- Entry-point button `✦ conjure with the scribe` added to
  `/dashboard/courses`.
- All 4 CI stages + `next build` green.

## 2026-04-25 — 10.1 · migration + types landed

- Migration `20260425000001_phase10_course_drafts.sql` applied to prod.
- `course_drafts` + 4 RLS policies + storage bucket
  `course-draft-sources` + 4 storage RLS policies + updated-at trigger.
- `lib/types/course-drafts.ts` hand-written row / insert / guard types
  with 12 vitest cases (stage transitions, char totals, approval
  gates). All four CI stages green.

## 2026-04-24 — 10.0 · ADRs landed

- ADR 0011: Vercel AI Gateway via AI SDK v6, per-stage model picks.
- ADR 0012: Supabase Storage `course-draft-sources` bucket, parse-on-
  upload into jsonb, no vector DB.

## 2026-04-24 — Phase 10 opened

Branch `feature/ai-course-maker` cut from `main`. Plan + status files
in place. CLAUDE.md updated with the sub-phase ritual (plan →
implement → test → review → commit → log, one cycle per sub-phase).
