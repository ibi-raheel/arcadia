# ADR 0012 — Source-doc upload + parse strategy for the scribe

**Date:** 2026-04-24
**Status:** Accepted
**Supersedes:** —
**Related:** ADR 0011 (AI Gateway), Phase 10 plan (`phases/phase-10_plan.md`)

## Context

The scribe accepts source documents (PDF, DOCX, TXT) as grounding
context for the generated course. Three questions:

1. Where do uploaded files live?
2. How are they parsed to text?
3. How is that text fed into Claude at each generation stage?

At Arcadia's scale (MVP, tens of creators, typical course source <
2 MB) a naive approach is safe. We avoid RAG + a vector DB for now.

## Decision

1. **Storage:** Supabase Storage bucket `course-draft-sources`, path
   `{creator_id}/{draft_id}/{filename}`. RLS is creator-only for
   read, insert, update, delete.
2. **Parse:** server-side on first upload. `pdf-parse` for PDF,
   `mammoth` for DOCX, raw `file.text()` for TXT. Parsed plaintext
   + metadata stored in `course_drafts.sources` (jsonb array of
   `{id, filename, char_count, text}`). Raw file stays in Storage
   for audit / re-parse.
3. **Context feed:** at each stage, build a prompt that concatenates
   all source texts (capped at 600k chars across a draft ≈ 150k
   tokens) and passes it as a single system/user message to Claude.
   No chunking, no embeddings, no retrieval.

## Rationale

**Storage bucket, not bytea column.** Postgres rows with megabytes of
binary data are a footgun (replication, backups, egress). Storage is
purpose-built.

**Parse on upload, not on generate.** Parsing a 5 MB PDF takes a
second or two. Doing it once at upload and caching the text in jsonb
means every later stage has instant access. The raw file stays so we
can re-parse if the library changes or we need to show the creator
which file a sentence came from.

**No RAG.** The hard cap (600k chars per draft, ≈ 150k tokens) fits
comfortably inside Claude's 1M context window with room for the
prompt, stage scaffold, and output. Building a vector DB + embedding
pipeline for a problem that doesn't exist yet is the wrong bet.
Real-world course source material from a single creator is rarely
larger than 2 MB; a vector DB would cost more to operate than the
savings on context tokens.

If a future creator uploads 10 MB of material, we degrade gracefully:
truncate to the 600k cap and show a hand-script note ("~ the scribe
read the first 600 pages ~"). Past that point, we revisit RAG.

**Parse libraries.**

- `pdf-parse` — small, synchronous, buffer-in text-out. No Chromium.
- `mammoth` — the standard DOCX → text converter.
- TXT — built-in `await file.text()` in Node.

None of these bring heavy native deps that break Vercel builds.

## Consequences

**Good:**

- One table (`course_drafts`) holds both the state machine and the
  cached text.
- Storage RLS mirrors the pattern we already use for course
  thumbnails (migration 20260421000002) — same muscle memory.
- No separate sources table to join; `sources` jsonb is enough.

**Watch out:**

- Max draft size = 2 MB total files / 600k parsed chars. Enforce at
  upload. Creator sees "~ that's heavy — under 2 MB per draft ~" if
  they exceed.
- `pdf-parse` doesn't handle scanned PDFs (no OCR). Document this
  limit in `/docs/guides/scribe.md` (written in Phase 10.9). If a
  creator uploads a scanned PDF, the text field will be empty — show
  a hand-script warning in the satchel UI.
- PDF text extraction loses structure (tables, columns). Creators
  should prefer DOCX / TXT / markdown for structured material.

## Alternatives considered

- **Vector DB + embeddings (Supabase pgvector).** Premature. Adds a
  library, an embedding call per paragraph, and retrieval complexity
  for a problem that starts at 0 and grows slowly.
- **Parse on every stage.** Doubles latency for no benefit. Parse
  results are deterministic given a file; cache them.
- **Upload straight to Anthropic's Files API.** Couples us to one
  provider (violates ADR 0011's provider-agnosticism) and bypasses
  Supabase's RLS story.

## Implementation notes

1. Migration (10.1) creates the bucket and RLS policies.
2. `uploadDraftSource(draftId, file)` server action: validate mime +
   size → upload to Storage → parse → append to `course_drafts.sources`.
3. `lib/scribe/context.ts` helper: `buildSourceContext(sources)` →
   plain string, respects the 600k char cap, adds a short header per
   file so Claude can cite.
4. All upload validation is server-side. Never trust the client's
   reported mime.
