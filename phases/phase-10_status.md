# Phase 10 — Status

Source plan: `phase-10_plan.md`. Entries chronological, newest on top.
Per the sub-phase ritual in root `CLAUDE.md`: one line per sub-phase
as it lands.

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
