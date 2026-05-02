// Hand-authored sample items for the three simulated categories
// (Patterns, Tools, Exclusives). Courses come from the real `courses`
// table — see `app/market/page.tsx`.
//
// Mix of free + paid; ownership is in-memory (resets on reload). Prices
// are scriptorium-coin (visual currency, no real money). The fixtures
// are intentionally varied so the preview pane has something different
// to render for each kind.

import type { MarketItem } from './types';

const PATTERNS: ReadonlyArray<MarketItem> = [
  {
    id: 'pattern-launch-checklist',
    category: 'patterns',
    title: 'The Course Launch Checklist',
    creatorName: 'Mira Hollow',
    kicker: 'a pattern · notion doc',
    tagline: '47 steps from idea to first sale, copy-paste into Notion.',
    description:
      'Every block I run before pressing Publish on a paid course — pricing tests, asset list, email warm-up sequence, day-of broadcast plan, refund policy template. Lifted from launches that earned $20k+ each.',
    price: { kind: 'free' },
    preview: {
      kind: 'list',
      items: [
        '01 — pricing test (3 anchor points)',
        '02 — outline → 7-bullet promise',
        '03 — three-email warm-up cadence',
        '04 — landing page above-the-fold copy',
        '05 — first-day broadcast schedule',
        '… (47 total)',
      ],
    },
    owned: false,
  },
  {
    id: 'pattern-figma-coverpack',
    category: 'patterns',
    title: 'Coverpack — 24 Course-Cover Templates',
    creatorName: 'Idris Vellum',
    kicker: 'a pattern · figma file',
    tagline: '24 cover templates for course thumbnails, sized for every platform.',
    description:
      'Drop your title in, swap the colour, export. Sized for YouTube (1280×720), Skool (1024×512), Twitter (1600×900) and a square 1080. Includes the variable-font setup and three palette presets.',
    price: { kind: 'paid', coin: 8 },
    preview: {
      kind: 'mock-screenshot',
      caption:
        'A 4×6 grid of cover thumbnails — soft gradients, large display type, three colour families. The kind of cover that looks at home in a paid catalogue.',
    },
    owned: false,
  },
  {
    id: 'pattern-cohort-emails',
    category: 'patterns',
    title: 'Cohort-Welcome Email Sequence',
    creatorName: 'Tama Reedwright',
    kicker: 'a pattern · 5-email sequence',
    tagline: 'Five emails that cut your no-show rate in half.',
    description:
      'Five plain-text emails — sign-up confirm, calendar nudge, day-before, "we start in an hour", and a recap. The sequence I run for every cohort. Variables marked, plug into your ESP of choice.',
    price: { kind: 'paid', coin: 6 },
    preview: {
      kind: 'text',
      body: "Subject: see you in the tavern, {{name}}\n\nyou said yes. that's the part most people don't do.\n\nhere's what happens next:\n— sunday 7pm: the doors open\n— bring something half-finished\n…\n\n(four more like this; total ~1,800 words.)",
    },
    owned: false,
  },
  {
    id: 'pattern-content-grid',
    category: 'patterns',
    title: 'The Weekly Content Grid',
    creatorName: 'Nox Penmark',
    kicker: 'a pattern · spreadsheet',
    tagline: 'A single sheet that decides what you post for a month.',
    description:
      'A spreadsheet with 28 days down the side and 4 channels across the top. Each cell suggests a content type (essay, clip, thread, recap). Stop guessing what to post; just fill the grid.',
    price: { kind: 'free' },
    preview: {
      kind: 'mock-screenshot',
      caption: 'Sample row: Mon · long essay · short clip · 7-tweet thread · weekly recap.',
    },
    owned: false,
  },
];

const TOOLS: ReadonlyArray<MarketItem> = [
  {
    id: 'tool-clip-cutter',
    category: 'tools',
    title: 'ClipCutter — auto-cut shorts from a long video',
    creatorName: 'Hollis Marrow',
    kicker: 'a tool · macOS app',
    tagline: 'Drop a 90-min recording in, get 6 vertical clips out.',
    description:
      'Local-only macOS app. Detects the loud bits, makes vertical 9:16 cuts with auto-captions, exports to MP4. No upload, no subscription. Universal binary for Apple Silicon + Intel.',
    price: { kind: 'paid', coin: 24 },
    preview: {
      kind: 'mock-screenshot',
      caption:
        'A dark window with a horizontal waveform, six green segments highlighted, and a vertical preview pane on the right showing the first auto-cut clip with captions burned in.',
    },
    owned: false,
  },
  {
    id: 'tool-scribe-cli',
    category: 'tools',
    title: 'Scribe-CLI — turn a transcript into a written lesson',
    creatorName: 'Roan Inkwell',
    kicker: 'a tool · cli · open source',
    tagline: 'pipe your transcript in, get a markdown lesson out.',
    description:
      "A small Node CLI. Reads a .vtt or .srt, structures it into a lesson with H2 sections, callouts and a TL;DR. MIT-licensed; the binary is here too if you don't want to npm-install.",
    price: { kind: 'free' },
    preview: {
      kind: 'text',
      body: '$ scribe transcribe ./session-04.vtt --out lesson.md\n→ 4 sections detected\n→ 12 callouts\n→ TL;DR drafted\nwritten ./lesson.md (1,820 words)',
    },
    owned: false,
  },
  {
    id: 'tool-comment-sentry',
    category: 'tools',
    title: 'Comment Sentry — keep your YouTube comments tidy',
    creatorName: 'Lyra Goldgrove',
    kicker: 'a tool · chrome extension',
    tagline: 'Hide spam, surface real questions, batch-pin replies.',
    description:
      'Chrome extension. Watches the comment section of any of your videos, highlights questions vs reactions, lets you pin or reply in batches. No data leaves the browser.',
    price: { kind: 'paid', coin: 12 },
    preview: {
      kind: 'mock-screenshot',
      caption:
        'A YouTube studio comments view with a sidebar overlay — comments grouped under "questions", "reactions", "spam (auto-hidden)" with quick-reply buttons.',
    },
    owned: false,
  },
];

const EXCLUSIVES: ReadonlyArray<MarketItem> = [
  {
    id: 'exclusive-launch-coffer',
    category: 'exclusives',
    title: 'The Launch Coffer',
    creatorName: 'Mira Hollow',
    kicker: 'a coffer · 4 pieces',
    tagline: 'Everything I use to launch a paid course, in one sealed bundle.',
    description:
      'My Launch Checklist (free), the Cohort-Welcome Email Sequence, the Weekly Content Grid (free) and a 90-minute private debrief recording from my last $30k launch. Roughly 30% under the parts.',
    price: { kind: 'paid', coin: 32 },
    preview: {
      kind: 'list',
      items: [
        '✓ The Course Launch Checklist (47 steps)',
        '✓ Cohort-Welcome Email Sequence (5 emails)',
        '✓ The Weekly Content Grid (28 days)',
        '✓ 90-min launch debrief recording (audio)',
      ],
    },
    bundleContents: ['launch checklist', '5-email sequence', 'content grid', '90-min debrief'],
    owned: false,
  },
  {
    id: 'exclusive-creator-toolkit',
    category: 'exclusives',
    title: 'The Creator Toolkit',
    creatorName: 'Hollis Marrow',
    kicker: 'a coffer · 3 tools + bonus',
    tagline: 'ClipCutter + Comment Sentry + Scribe-CLI, plus a private screencast course.',
    description:
      'All three of the workshop tools I sell separately, bundled with a 6-lesson screencast course on building tools that solo creators actually want.',
    price: { kind: 'paid', coin: 54 },
    preview: {
      kind: 'list',
      items: [
        '✓ ClipCutter (macOS app)',
        '✓ Comment Sentry (Chrome extension)',
        '✓ Scribe-CLI (open source, but signed binary)',
        '✓ "Tools That Sell" — 6-lesson screencast course',
      ],
    },
    bundleContents: ['ClipCutter', 'Comment Sentry', 'Scribe-CLI', '6 screencasts'],
    owned: false,
  },
  {
    id: 'exclusive-quiet-shelf',
    category: 'exclusives',
    title: 'The Quiet Shelf',
    creatorName: 'the realm keepers',
    kicker: 'a coffer · seasonal · free',
    tagline: 'A free, members-only sampler — refreshed each month.',
    description:
      'A small free coffer rotated by the keepers. This month: one pattern (Coverpack preview, 6 of 24), one tool (Scribe-CLI in full), and a recorded fireside chat from the tavern.',
    price: { kind: 'free' },
    preview: {
      kind: 'list',
      items: [
        '✓ Coverpack sampler (6 of 24 templates)',
        '✓ Scribe-CLI (full)',
        '✓ Fireside chat recording (47 min)',
      ],
    },
    bundleContents: ['Coverpack sampler', 'Scribe-CLI', 'fireside chat'],
    owned: false,
  },
];

export const FIXTURE_ITEMS_BY_CATEGORY = {
  patterns: PATTERNS,
  tools: TOOLS,
  exclusives: EXCLUSIVES,
} as const;
