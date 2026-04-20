# ADR 0006 — Use YouTube unlisted (not Cloudflare Stream) as the demo-only MVP video host

**Status:** accepted
**Date:** 2026-04-20
**Deciders:** user
**Supersedes:** amends TAD §7 (video delivery) for the MVP demo only
**Related:** `phases/phase-03_plan.md` decisions D, G, K, M
**Scope caveat:** this ADR covers the MVP / demo window only. Any transition from "demo" to "product used by paying creators" triggers a successor ADR swapping to a real host.

## Context

TAD §7 names **Cloudflare Stream** as the MVP video host: pre-signed TUS uploads, signed playback URLs, HMAC webhooks, HLS adaptive delivery.

Phase 3 is the first phase that uses video. CF Stream has no free tier and needs a card. During pre-plan decision-making we evaluated four free/cheap options:

- **Cloudinary** — free 25 credits/month, no card, real HLS + signed URLs. Drafted as the MVP pick (ADR 0006 original version).
- **Supabase Storage** — already on our plan, signed URLs built-in, but no transcoding (single-bitrate MP4 only).
- **Vercel Blob** — same shape as Supabase Storage with a smaller free tier.
- **YouTube unlisted** — free, zero accounts, zero quota, works in 30 seconds, but with material downsides.

User opted for **YouTube unlisted** with explicit scope: this is for the demo week only, not for real paying creators. The Phase 4 / Phase 5 planning carries a hard swap requirement to a real host before any course is sold.

## Decision

Use **YouTube unlisted** for Phase 3 video hosting.

Specifics:

- **Upload:** no upload flow in Arcadia. The creator uploads to YouTube via their own channel using YouTube's own UI, sets visibility to **Unlisted**, copies the share URL, and pastes it into the Arcadia lesson editor. Arcadia extracts and stores the 11-character video ID only.
- **Delivery:** YouTube IFrame Player API. Load `https://www.youtube.com/iframe_api` on the lesson page; instantiate `YT.Player` with the video ID; feed `currentTime` from `lesson_progress.watched_secs` via `startSeconds` on cueing.
- **Progress tracking:** `onStateChange` handler + polled `getCurrentTime()` every 10 s. Same 10 s debounce pattern as planned; debounce source is a `setInterval`, not a DOM `timeupdate` event, because the IFrame API doesn't fire one.
- **Duration:** read from `player.getDuration()` on `onReady`; upserted to `lessons.duration_sec` on first successful load. No YouTube Data API call needed, so no Google Cloud API key required.
- **Storage column:** `lessons.youtube_video_id text` (11 chars) added in migration `20260421000001_phase3_courses_lessons_progress.sql`. Phase-0's `lessons.cf_stream_id` column stays nullable and unused; reserved for the real-host swap.
- **Env vars:** none. YouTube is credential-free for unlisted video embeds.
- **Access control:** **none at the video layer.** Anyone with the URL or the 11-char ID can watch. This is accepted for the demo scope. Arcadia's RLS still gates `lessons` reads — a non-enrolled member can't see the `youtube_video_id` column value at all. But once a valid member has loaded the page, they can trivially copy the ID and share it outside Arcadia.

## Consequences

**Positive**

- Zero new accounts, zero new secrets, zero new API surface. Fastest possible path to a demo video lesson.
- Zero cost. No free-tier quota to monitor, no rate limits at our scale.
- Adaptive bitrate + multiple resolutions + worldwide CDN — all free, via YouTube's infrastructure.
- Creator's familiar upload UX (they already know the YouTube creator studio).

**Negative (accepted for demo scope)**

- **No real access control.** The URL / ID is the key; there's no signing, no TTL, no revocation. A shared ID is shared forever.
- **YouTube TOS forbids using YouTube as a CDN for paid / gated content at scale.** Low-risk for one demo video; a real violation risk for real creators. This is the single strongest reason the demo-only scope is hard-gated.
- **Branding leaks.** YouTube logo in the player, "Watch on YouTube" link, suggested videos at the end (we can disable via `rel=0`), potential ads depending on the channel's monetisation state. Not what a polished course product should look like.
- **Analytics leak.** View data goes to Google, not to Arcadia. We get raw watched-seconds from the IFrame API; everything else (device, geo, referrer) is YouTube's.
- **Player coupling.** Any future change to the YouTube IFrame API (Google has deprecated embed APIs before) could break playback without notice. Low probability in a 3-month MVP window; real risk long-term.

**Neutral**

- `lesson_progress` + `watched_secs` flow is identical to any other host — progress is stored in Arcadia's Supabase, not YouTube.
- Schema swap-back to a real host is trivial: add a new column (`cloudinary_public_id`, `cf_stream_id`, `mux_playback_id`, whatever we pick), migrate content, replace the player component. `youtube_video_id` becomes nullable / unused.

## Swap-back path (mandatory before paying creators)

Before any paying creator uploads content to Arcadia:

1. Pick a real host (CF Stream if budget tolerates; Mux if engineering polish matters; Cloudinary if staying on a free tier longer).
2. New ADR recording the choice + its tradeoffs.
3. New migration adding the relevant column (e.g. `cloudinary_public_id`), keeping `youtube_video_id` nullable.
4. New API routes for signed upload + signed delivery. Replace the YouTube IFrame player with the new vendor's player or a video.js wrapper.
5. Migrate existing demo content (if any) by re-uploading to the new host and backfilling the new column.
6. Only after all of that: drop `youtube_video_id` + the YouTube code paths.

Estimated 1–2 days of engineering. Record the decision in a successor ADR at that time.

## Exit criteria from "demo" scope

Any of these trigger the swap-back:

- A creator who is not the Arcadia team uploads a lesson.
- Any course is made available for purchase (Phase 4 Market enrol button wired up against a real payment rail — not "enrol", payment).
- User-generated content from real members starts to land.
- Total stored video minutes across the Arcadia YouTube channel exceeds 30 minutes. (Arbitrary ceiling to force a re-evaluation before the demo becomes "production".)

Until then: YouTube unlisted is acceptable.
