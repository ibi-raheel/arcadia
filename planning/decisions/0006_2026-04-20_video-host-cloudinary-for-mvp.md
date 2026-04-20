# ADR 0006 — Use Cloudinary (not Cloudflare Stream) as the MVP video host

**Status:** accepted
**Date:** 2026-04-20
**Deciders:** user
**Supersedes:** amends TAD §4.4 for the MVP
**Related:** `phases/phase-03_plan.md` decisions D, G, K, M

## Context

TAD §4.4 and the MVP phase-plan (§Phase 0 Week 1, §Phase 3 Week 9) name **Cloudflare Stream** as the video host: pre-signed TUS upload URLs, signed playback URLs, HMAC-verified webhooks for `duration_sec` / transcode completion.

Phase 3 is the first phase that actually uses video. During pre-plan confirmation the user asked whether there's a free option. Findings:

- **CF Stream** has no free tier — pay-per-use ($5 / 1000 min stored + $1 / 1000 min delivered), card required.
- **Cloudinary** free tier: 25 credits/month shared across storage, bandwidth, and transformations (1 credit ≈ 1 GB storage OR 1 GB bandwidth OR 1000 transforms). No card. Includes auto-transcoding, HLS adaptive streaming, signed URLs, automatic thumbnails, and a video.js-based player (`cld-video-player`).
- **Mux** gives a $20 signup credit but needs a card once the credit is consumed.
- **Supabase Storage** is free within our existing plan but doesn't transcode — we'd serve a single-bitrate MP4.

The MVP demo is one course with one video lesson. Expected usage: a handful of uploads (~500 MB total) + bandwidth from a single-digit number of viewers. Well inside Cloudinary's 25-credit budget.

## Decision

Use **Cloudinary** for Phase 3 video hosting. Swap the CF Stream code path before writing it — the phase-03 plan has been amended accordingly.

Specifics:

- **Upload:** browser-direct upload with a signed signature minted server-side. Next.js API route `/api/cloudinary/sign-upload` reads `CLOUDINARY_API_SECRET` and returns `{ timestamp, signature, api_key, public_id, folder, eager }`. Client POSTs the file + signed params to `https://api.cloudinary.com/v1_1/<cloud>/video/upload`.
- **Delivery:** Cloudinary's `cld-video-player` web component (MIT, video.js-based), fed a signed delivery URL minted by `/api/video/sign/[lessonId]` with ~1 h TTL.
- **Storage columns:** `lessons.cloudinary_public_id text` + `lessons.duration_sec integer` added in migration `20260421000001_phase3_courses_lessons_progress.sql`. Phase-0's `lessons.cf_stream_id` column stays nullable and unused for now; drop in Phase 4 if Cloudinary sticks.
- **Env vars:** `CLOUDINARY_CLOUD_NAME` (public), `CLOUDINARY_API_KEY` (server), `CLOUDINARY_API_SECRET` (server). Set on the `arcadia-web` Vercel project for Development, Preview, and Production environments.
- **Webhooks:** not wired for MVP. Upload response carries `duration` synchronously; no async confirmation needed. Cloudinary supports webhooks if we want them post-MVP.

## Consequences

**Positive**

- Phase 3 stays on the free tier of a managed video platform — demo-ready with HLS adaptive bitrate, signed URLs, and auto-transcoding.
- No blocker on user adding a credit card to a new service during early development.
- Swap-back path to CF Stream is well-defined: replace `cloudinary_public_id` with `cf_stream_id`, swap the sign-upload API route, swap the player component. ~1 day of work.

**Negative**

- Deviates from TAD §4.4. TAD should be amended inline (not a new version bump — `v1.2 (2026-04-20)` note in §4.4) pointing to this ADR.
- 25-credit ceiling is real. Test uploads during development can chew through it if we're careless. Mitigation: aggressive cleanup in Cloudinary dashboard; folder convention (`arcadia/test/` vs `arcadia/prod/`) so demo content is separable.
- Cloudinary's signing algorithm differs from CF Stream's JWT approach. Not a leak risk — just a different crypto recipe.
- Two sets of signing / delivery primitives if we ever migrate back. Keeping the column named `cloudinary_public_id` (not a generic `video_asset_id`) makes the swap explicit rather than hidden behind an abstraction.

**Neutral**

- TAD's "signed playback URLs" intent is preserved — Cloudinary supports signed delivery URLs with TTL, same pattern.
- No impact on non-video phases. Phase 4 Market and Phase 5 polish don't touch the video host.

## Swap-back path (if we outgrow the free tier)

1. Create CF Stream account + set `CF_STREAM_WEBHOOK_SECRET` on Vercel.
2. New migration: add `lessons.cf_stream_id` (already exists as nullable) + backfill via one-off copy script that re-uploads assets from Cloudinary to CF Stream. Drop `cloudinary_public_id`.
3. Replace `/api/cloudinary/sign-upload` with `/api/stream/upload`. Replace `cld-video-player` with `<stream>` web component.
4. Add webhook at `/api/stream/webhook` (HMAC-verified).
5. Amend TAD §4.4 again, or supersede this ADR.

Estimated 1 day of engineering. Record in a new ADR at that point.
