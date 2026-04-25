# Phase 11 Plan: The Sage (AI guide) + UI legibility audit

**Goal A:** The bearded man on the rug in the upper-left of the
square stops being a random-tip dispenser and becomes an AI guide
who knows everything about Arcadia. Walk near him, press ENTER, a
scriptorium-styled chat popup opens. Ask anything — "where do I
publish a course?" / "how does the tavern feed work?" / "what's a
realm?" — he answers from a curated knowledge base built from the
MVP docs + ADRs + changelog.

**Goal B:** Once the sage ships, do a deep legibility pass across
every React surface. Anything that's hard to read — low contrast,
ill-fitting fonts, illegible at the page's actual viewport — gets
fixed.

**Branch:** `feature/sage-and-ui-audit` → PR against `main`.

## Sub-phases

### 11.0 — ADR 0014 + ADR 0015 + this plan

- ADR 0014: Sage knowledge base. **Recommend:** static corpus
  baked at build time from `/docs/mvp/*.md` + `/planning/decisions/
  *.md` + root `README.md`. ~30k–50k chars total — fits Gemini
  Pro's 1M context with room to spare. No vector DB. Re-bake on
  doc changes via a small build helper that reads the markdown
  files at server start.
- ADR 0015: Chat surface. **Recommend:** React popup, not Phaser
  bubble. Phaser keeps the proximity prompt (same pattern as the
  lodge entry — ENTER to engage). Popup mounts in GameSquare via a
  game-event listener (same pattern as TavernFeatures + the feed).

### 11.1 — Knowledge corpus + system prompt

- `lib/sage/knowledge.ts` — reads markdown from disk via
  `fs.promises.readFile` at server start; concatenates + labels
  each file; caches the result in module scope (server-only, no
  client bundle). Hard cap at 200k chars; truncate oldest by
  modification time if exceeded.
- `lib/sage/prompts.ts` — system prompt: voice (warm, old-fashioned,
  uses "traveller" as the default address, won't hallucinate when
  the corpus is silent), knowledge boundary ("if the docs don't
  cover it, say so plainly"), refusal posture (politely declines
  to discuss anything outside Arcadia).
- **Test:** vitest cases assert the corpus includes labelled
  sections per file, the prompt embeds it, the system prompt
  contains the persona phrases.

### 11.2 — Chat route

- `POST /api/sage/chat` — streams Gemini Flash responses. Body:
  `{ messages: [{role, content}] }`. Wraps the corpus into a
  single system message + the conversation history; `streamText`
  returns the response.
- 60s maxDuration, nodejs runtime.
- **Test:** smoke test — POST a single user message, verify the
  stream returns non-empty text and references something Arcadia-
  specific.

### 11.3 — React popup (replaces Phaser bubble)

- New `components/sage/SageDialogue.tsx` — fullscreen-overlay
  ScrollCard (similar size to FeedScroll). Header: DropCap "S",
  Kicker "the sage", title "ask the wanderer." Body: scrollable
  conversation transcript with user / sage roles styled
  differently. Footer: VellumField input + "ask" WaxButton.
- New `components/sage/SagePrompt.tsx` — small pill mounted near
  the avatar when in proximity. Shows "Press ENTER to speak with
  the wanderer." Same visual language as the lodge prompt.
- **`SquareScene.ts`:** strip `createNpcBubble` / `showRandomNpcTip`
  / `updateNpcBubble`. Replace with a ProximityPromptManager (same
  helper as the academy lectern + market crystal + tavern
  tablet) that fires `SQUARE_OPEN_SAGE_EVENT` on ENTER.
  `squareLayersConfig.npc.tips` array deleted.
- **`GameSquare.tsx`:** mount `SageFeatures.tsx` (new) — listens
  for the event, opens the dialogue popup, manages chat state.
- **Test:** manually verify proximity → prompt → ENTER → popup;
  send a message → tokens stream back.

### 11.4 — Conversation persistence

- `lib/sage/storage.ts` — read/write conversation history in
  `localStorage` under `arcadia.sage.history`. Cap at the last 30
  messages. Loaded on dialogue open, saved on every send.
- **Test:** vitest case for the storage helper (read / write /
  cap).

### 11.5 — Docs + PR

- `phases/phase-11_status.md` running log.
- `docs/changelog/2026-04-25_phase-11-sage-and-ui-audit.md` exit
  write-up.
- Root README line.
- ADR 0014, 0015 merged in 11.0.

### 11.6 — UI legibility audit

Method:

1. Walk every public route (`/`, `/login`, `/signup`, `/world`,
   `/academy`, `/market`, `/tavern`, every `/dashboard/*`, every
   `/preview/*`, every `/kit`).
2. For each surface, list anything that is:
   - **Low contrast** — body text, mono labels, or hand-script
     under 4.5:1 against its background, or display titles under
     3:1.
   - **Too small** — body text under 14 px on desktop, mono kicker
     labels under 10 px.
   - **Wrong font** — system fonts where the design system calls
     for the display serif or hand script.
   - **Disabled-button confusion** — disabled buttons that look
     identical to ghost buttons.
   - **Color drift** — direct hex values in inline styles where a
     CSS variable exists.
3. Land fixes in batches per surface. One commit per surface
   audited. Use the `/security-review` + `/review` slash commands
   to gut-check.
- **Test:** every fix is verified by a screenshot of the page +
  the same page after.

## Test criteria (phase-wide)

1. The sage answers basic Arcadia questions ("what's a realm?",
   "how do I create a course?", "where do members go to chat?")
   correctly from the corpus.
2. The popup is fully styled in scriptorium voice — no leftover
   Phaser bubble.
3. Conversation history survives page reloads.
4. After 11.6, no surface has body text under 4.5:1 contrast.
5. 5-stage CI green.

## Risks / unknowns

- **Knowledge staleness.** The corpus is rebuilt on server cold-
  start (Vercel Functions reuse instances per Fluid Compute). Doc
  edits land at the next deploy, not live. Acceptable for MVP.
- **Token cost.** Long convos with the corpus in the system prompt
  are pricy on Gemini Pro. Mitigation: use `gemini-2.5-flash`
  (cheap), and keep the corpus to ~50k chars.
- **Off-topic conversations.** Users will try jailbreaks. The
  system prompt must refuse politely; we don't store anything
  else.
- **localStorage inflation.** 30-message cap + per-message size
  cap (2k chars).

## Deferred (do not implement in Phase 11)

- Voice / audio input.
- Sage with a memory of THIS user's past sessions across devices
  (would need a per-user table).
- Sage as a Phaser sprite that walks around the square.
- Tool use (e.g. sage navigates the user to a course).
