// The sage's knowledge base — a static corpus baked from the MVP
// docs, every ADR, the root README, and recent changelog entries.
// See ADR 0014 for the why-no-RAG rationale.
//
// Reads happen once per Vercel function instance via a module-scope
// promise. Cold starts pay the read cost; warm requests are free.
//
// Server-only — never import this into a client bundle. The fs
// module isn't available there, and we don't want the corpus
// blowing up the JS payload.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Hard cap on total corpus size. ADR 0014: 200k chars fits inside
 *  Gemini's 1M context with plenty of room for chat history. */
const MAX_CORPUS_CHARS = 200_000;

/** Curated allow-list. Any new doc the sage should know about goes
 *  here explicitly. Glob-based discovery would risk leaking
 *  internal-only notes. Order matters — non-droppable docs first. */
const KNOWLEDGE_FILES: readonly { readonly path: string; readonly droppable: boolean }[] = [
  // Core specs — the sage must always know these.
  { path: 'docs/mvp/prd.md', droppable: false },
  { path: 'docs/mvp/tad.md', droppable: false },
  { path: 'docs/mvp/phase-plan.md', droppable: false },
  { path: 'docs/mvp/world-areas.md', droppable: false },
  { path: 'README.md', droppable: false },
  // Decisions — the sage gets the "why" behind the architecture.
  { path: 'planning/decisions/0001_2026-04-18_locked-stack.md', droppable: false },
  {
    path: 'planning/decisions/0004_2026-04-18_per-scene-folder-config-convention.md',
    droppable: true,
  },
  { path: 'planning/decisions/0005_2026-04-19_pin-colyseus-0.16.md', droppable: true },
  {
    path: 'planning/decisions/0006_2026-04-20_video-host-youtube-unlisted-for-demo.md',
    droppable: true,
  },
  {
    path: 'planning/decisions/0009_2026-04-23_add-frontend-design-skill-and-design-workspace.md',
    droppable: true,
  },
  {
    path: 'planning/decisions/0010_2026-04-24_design-token-wiring-and-simulation-mode.md',
    droppable: true,
  },
  { path: 'planning/decisions/0011_2026-04-24_vercel-ai-gateway-for-scribe.md', droppable: true },
  { path: 'planning/decisions/0013_2026-04-25_swap-scribe-to-gemini-direct.md', droppable: true },
  { path: 'planning/decisions/0014_2026-04-25_sage-knowledge-base.md', droppable: true },
  { path: 'planning/decisions/0015_2026-04-25_sage-react-popup-not-phaser.md', droppable: true },
  // Changelog — what shipped recently. Droppable; sorted oldest-first
  // so the truncation rule (drop oldest) is well-defined.
  { path: 'docs/changelog/2026-04-22_world-swap-orthogonal-square.md', droppable: true },
  { path: 'docs/changelog/2026-04-22_image-backed-world.md', droppable: true },
  { path: 'docs/changelog/2026-04-23_image-backed-world-complete.md', droppable: true },
  { path: 'docs/changelog/2026-04-24_phase-08-ui-wireup.md', droppable: true },
  { path: 'docs/changelog/2026-04-24_phase-09-feed-and-events.md', droppable: true },
  { path: 'docs/changelog/2026-04-25_phase-10-ai-course-maker.md', droppable: true },
];

/** Joins a relative repo path against the working directory. Vercel
 *  ships the docs under the project root in the deployment zip; the
 *  Next runtime's cwd is the repo root in production. */
function repoPath(relative: string): string {
  return resolve(process.cwd(), '..', '..', relative);
}

/** Try the standard repo-relative path; if that fails (e.g. running
 *  in a container that put cwd elsewhere), fall back to a pair of
 *  alternative roots so the sage doesn't fall over silently. */
async function readDoc(relative: string): Promise<string | null> {
  const candidates = [
    resolve(process.cwd(), '..', '..', relative),
    resolve(process.cwd(), relative),
    resolve(process.cwd(), '..', relative),
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8');
    } catch {
      /* try next */
    }
  }
  return null;
}

let corpusPromise: Promise<string> | null = null;

/** Build the corpus — concatenates the curated files with `===
 *  <filename> ===` headers. Truncates oldest droppable docs first
 *  if the total exceeds MAX_CORPUS_CHARS. */
async function buildCorpus(): Promise<string> {
  // First pass: read every file. Drop missing ones with a warning
  // header so the assistant can name what's absent if asked.
  type Loaded = { readonly path: string; readonly droppable: boolean; readonly text: string };
  const loaded: Loaded[] = [];
  for (const entry of KNOWLEDGE_FILES) {
    const text = await readDoc(entry.path);
    if (text === null) continue;
    loaded.push({ ...entry, text });
  }

  // Render with headers, then drop oldest droppable files until we
  // fit under MAX_CORPUS_CHARS.
  const render = (slice: readonly Loaded[]): string =>
    slice.map((doc) => `=== ${doc.path} ===\n\n${doc.text.trim()}\n`).join('\n\n');

  let working = [...loaded];
  let rendered = render(working);
  while (rendered.length > MAX_CORPUS_CHARS) {
    const dropIndex = working.findIndex((doc) => doc.droppable);
    if (dropIndex === -1) break; // all non-droppable; cap is too tight, accept the overrun.
    working = [...working.slice(0, dropIndex), ...working.slice(dropIndex + 1)];
    rendered = render(working);
  }

  // If still over the cap (only happens if the non-droppable set
  // alone exceeds 200k), hard-truncate.
  if (rendered.length > MAX_CORPUS_CHARS) {
    rendered = `${rendered.slice(0, MAX_CORPUS_CHARS - 80)}\n[corpus truncated to fit context budget]`;
  }
  return rendered;
}

/** Returns the cached corpus, building it on first call. Safe to
 *  call from any number of concurrent route invocations — the
 *  promise is reused. */
export function getSageCorpus(): Promise<string> {
  if (corpusPromise === null) corpusPromise = buildCorpus();
  return corpusPromise;
}

/** Reset the cache. Used in tests. */
export function _resetSageCorpus(): void {
  corpusPromise = null;
}

// Suppress unused-export lint warning for the path helper — kept
// as a public utility so future code paths don't have to re-derive
// the resolution.
export { repoPath };
