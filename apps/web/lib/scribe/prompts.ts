// Prompt templates for each stage of the scribe's ritual. Pure
// string assembly — no LLM calls. Kept in a separate module so the
// tests can assert shape + budget without hitting the network.
//
// Voice + constraints are consistent across stages: warm but brief
// (the scribe is writing for a creator who will edit), markdown-
// aware (so the output drops straight into the existing course
// builder), no emojis (out of scriptorium voice).

import type { DraftOutlineSection, DraftSource } from '@/lib/types/course-drafts';
import type { ScribePreferences } from '@/lib/scribe/preferences';

/** Hard cap from ADR 0012. Used to truncate source context so the
 *  prompt fits comfortably inside Claude's 1M window with room for
 *  the system, scaffold, and streaming response. */
export const MAX_SOURCE_CONTEXT_CHARS = 600_000;

/** Sentinel used when a source's parsed text is empty (scanned PDF /
 *  corrupt file). The scribe sees the filename but knows not to
 *  hallucinate content from it. */
export const EMPTY_SOURCE_SENTINEL = '[no readable text extracted — see filename for topic]';

const SCRIBE_SYSTEM = `You are the Scribe — a quiet, careful assistant who helps a human creator
shape a course from their notes and a short brief. You are not the author;
you draft, the creator approves or revises. Your voice is warm, direct, and
a little old-fashioned, in the tone of a hand-written note. Avoid emojis,
hashtags, and AI-preamble phrases like "Certainly!" or "Here is…". When
given source documents, ground your draft in them; if a passage doesn't
cover something the outline needs, say so plainly in the body instead of
inventing facts.`;

// ---------- source context assembly ----------

/**
 * Concatenates parsed source texts into a single labelled block,
 * truncating to `MAX_SOURCE_CONTEXT_CHARS`. Each source gets a
 * short header (filename + char count) so the scribe can cite if
 * we later surface citations in the UI.
 *
 * Returns `null` when there are no sources — callers should omit the
 * "the creator uploaded these sources" framing in that case.
 */
export function buildSourceContext(sources: readonly DraftSource[]): string | null {
  if (sources.length === 0) return null;

  let remaining = MAX_SOURCE_CONTEXT_CHARS;
  const parts: string[] = [];
  for (const source of sources) {
    const header = `=== ${source.filename} (${source.char_count.toLocaleString()} chars) ===\n`;
    const body = source.text.trim().length === 0 ? EMPTY_SOURCE_SENTINEL : source.text.trim();
    const budgeted = body.length <= remaining ? body : `${body.slice(0, remaining)}\n[truncated]`;
    parts.push(`${header}${budgeted}\n`);
    remaining -= budgeted.length + header.length;
    if (remaining <= 0) {
      parts.push("\n[… additional sources omitted — the satchel outgrew the scribe's budget …]\n");
      break;
    }
  }
  return parts.join('\n');
}

// ---------- stage prompts ----------

type PromptParts = {
  readonly system: string;
  readonly prompt: string;
};

/** Builds an optional "the creator's memory" block — the scribe's
 *  per-creator preferences (voice, audience). Injected into text
 *  prompts when any of the fields are set. Image style is handled
 *  separately in `imagePrompt`. */
function preferencesBlock(prefs: ScribePreferences | undefined): string | null {
  if (!prefs) return null;
  const parts: string[] = [];
  if (prefs.voice_guide) {
    parts.push(`Teaching voice (how the scribe writes for this creator):\n${prefs.voice_guide}`);
  }
  if (prefs.audience) {
    parts.push(`Audience (who the creator is writing for):\n${prefs.audience}`);
  }
  if (parts.length === 0) return null;
  return `The creator has set these standing preferences — follow them for every stage:\n\n${parts.join('\n\n')}`;
}

/**
 * Stage 1 — outline. Asks for a short section/lesson tree grounded
 * in the creator's brief + sources. Output is JSON so the caller
 * can parse with `streamObject` or a terminal `JSON.parse`.
 */
export function outlinePrompt(input: {
  readonly userPrompt: string;
  readonly sources: readonly DraftSource[];
  readonly preferences?: ScribePreferences;
  readonly revisionFeedback?: string;
}): PromptParts {
  const sourceBlock = buildSourceContext(input.sources);
  const brief = input.userPrompt.trim() || '(no written brief — infer from the sources)';

  const parts: string[] = [];
  const prefsBlock = preferencesBlock(input.preferences);
  if (prefsBlock) parts.push(prefsBlock);
  parts.push(`The creator's brief:\n"""\n${brief}\n"""`);

  if (sourceBlock) {
    parts.push(
      `The creator dropped these source documents into the satchel — ground the outline in them:\n\n${sourceBlock}`,
    );
  }

  if (input.revisionFeedback && input.revisionFeedback.trim().length > 0) {
    parts.push(
      `The creator reviewed the previous draft and asked for this revision:\n"""\n${input.revisionFeedback.trim()}\n"""\n\nDraft a fresh outline that takes the note into account.`,
    );
  }

  parts.push(
    [
      'Draft an outline for the course. Return ONLY valid JSON matching this shape:',
      '',
      '{',
      '  "title": string,                           // short, memorable',
      '  "sections": [',
      '    {',
      '      "title": string,                      // 2–5 words',
      '      "lessons": [',
      '        { "title": string }                 // 3–9 words each',
      '      ]                                     // 2–5 lessons per section',
      '    }                                        // 3–6 sections total',
      '  ]',
      '}',
      '',
      'Constraints:',
      '- No numbering prefixes like "1." or "Section 1:" — titles only.',
      '- No lesson should restate the section title.',
      '- Prefer concrete noun-phrase titles over abstract ones.',
      '- Do not include markdown or commentary outside the JSON object.',
    ].join('\n'),
  );

  return { system: SCRIBE_SYSTEM, prompt: parts.join('\n\n') };
}

/**
 * Stage 2 — lesson body. Writes one lesson at a time so the stream
 * stays tight and the user can approve / revise individually.
 * Output is markdown.
 */
export function lessonPrompt(input: {
  readonly courseTitle: string;
  readonly sectionTitle: string;
  readonly lessonTitle: string;
  readonly peerLessonTitles: readonly string[];
  readonly userPrompt: string;
  readonly sources: readonly DraftSource[];
  readonly preferences?: ScribePreferences;
  readonly revisionFeedback?: string;
}): PromptParts {
  const sourceBlock = buildSourceContext(input.sources);

  const peers =
    input.peerLessonTitles.length > 0
      ? `Other lessons in this section (for context — do not re-teach them here):\n- ${input.peerLessonTitles.join('\n- ')}`
      : '';

  const parts: string[] = [];
  const prefsBlock = preferencesBlock(input.preferences);
  if (prefsBlock) parts.push(prefsBlock);
  parts.push(
    `You are drafting a single lesson inside a larger course.`,
    `Course: ${input.courseTitle}`,
    `Section: ${input.sectionTitle}`,
    `This lesson: ${input.lessonTitle}`,
  );

  if (peers) parts.push(peers);

  if (input.userPrompt.trim()) {
    parts.push(`The creator's overall brief:\n"""\n${input.userPrompt.trim()}\n"""`);
  }

  if (sourceBlock) {
    parts.push(`Source material to ground the lesson in:\n\n${sourceBlock}`);
  }

  if (input.revisionFeedback && input.revisionFeedback.trim().length > 0) {
    parts.push(
      `The creator asked for this revision on this lesson specifically:\n"""\n${input.revisionFeedback.trim()}\n"""`,
    );
  }

  parts.push(
    [
      'Write the lesson body as GitHub-flavoured markdown.',
      '',
      'Shape:',
      '- Opening paragraph — 2–4 sentences framing what this lesson covers and why it matters.',
      '- 2–4 short sub-sections with H3 headings (###). Each has 1–3 short paragraphs.',
      '- Optional: a short bulleted checklist or step list if the topic warrants it.',
      '- Closing paragraph — one short paragraph naming what to do or watch for next.',
      '',
      'Constraints:',
      "- 400–800 words total. Don't pad.",
      '- No H1/H2 headings (the course shell owns those).',
      '- No "In this lesson we will…" preambles. Start with the substance.',
      '- No emojis, no hashtags, no "Certainly!". If a source passage is missing the fact you need, say so plainly.',
      '- No sign-offs at the end.',
    ].join('\n'),
  );

  return { system: SCRIBE_SYSTEM, prompt: parts.join('\n\n') };
}

/**
 * Stage 3 — image prompts. Locked style preamble (ADR 0011 + 0012)
 * ensures every image in a course reads like it belongs on the
 * same bookshelf.
 */
export const IMAGE_STYLE_PREAMBLE =
  'warm hand-inked illustration, vellum tones, sepia and verdigris accents, subtle paper texture, soft diffuse light, no text, no borders, composed like a small woodcut';

export function imagePrompt(input: {
  readonly target: 'thumbnail' | 'lesson';
  readonly courseTitle: string;
  readonly subjectTitle: string;
  readonly subjectSummary: string;
  readonly preferences?: ScribePreferences;
  readonly revisionFeedback?: string;
}): string {
  const framing =
    input.target === 'thumbnail'
      ? `A single emblematic scene that captures the whole course "${input.courseTitle}".`
      : `A single quiet scene for the lesson "${input.subjectTitle}" inside a course on "${input.courseTitle}".`;

  const subject = input.subjectSummary.trim().slice(0, 320);

  // Creator's standing image-style preference — appended to the
  // locked preamble so the scribe's aesthetic stays Arcadia-wide
  // while the creator can nudge within it.
  const personalStyle = input.preferences?.image_style
    ? ` ${input.preferences.image_style.trim()}.`
    : '';

  const revision = input.revisionFeedback
    ? ` Revise per the creator's note: "${input.revisionFeedback.trim().slice(0, 200)}"`
    : '';

  return `${IMAGE_STYLE_PREAMBLE}.${personalStyle} ${framing} Subject: ${subject}.${revision}`;
}

// ---------- outline parsing ----------

export type ParsedOutline = {
  readonly title: string;
  readonly sections: readonly DraftOutlineSection[];
};

/** Parse the streamed JSON outline text into our internal outline
 *  shape, assigning stable ids. Throws a descriptive error on bad
 *  JSON so the server action can surface a typed error. */
export function parseOutlineJson(raw: string): ParsedOutline {
  // Claude sometimes wraps JSON in markdown fences even when told
  // not to — strip them defensively.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `outline response was not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('outline response was not an object');
  }

  const obj = parsed as { title?: unknown; sections?: unknown };
  if (typeof obj.title !== 'string' || !Array.isArray(obj.sections)) {
    throw new Error('outline response missing title or sections array');
  }

  const sections: DraftOutlineSection[] = obj.sections.map((rawSection, sIdx) => {
    if (typeof rawSection !== 'object' || rawSection === null) {
      throw new Error(`section ${sIdx} was not an object`);
    }
    const section = rawSection as { title?: unknown; lessons?: unknown };
    if (typeof section.title !== 'string' || !Array.isArray(section.lessons)) {
      throw new Error(`section ${sIdx} missing title or lessons`);
    }
    return {
      id: `s${sIdx + 1}`,
      title: section.title.trim(),
      lessons: section.lessons.map((rawLesson, lIdx) => {
        if (typeof rawLesson !== 'object' || rawLesson === null) {
          throw new Error(`lesson ${sIdx}.${lIdx} was not an object`);
        }
        const lesson = rawLesson as { title?: unknown };
        if (typeof lesson.title !== 'string') {
          throw new Error(`lesson ${sIdx}.${lIdx} missing title`);
        }
        return { id: `l${sIdx + 1}_${lIdx + 1}`, title: lesson.title.trim() };
      }),
    };
  });

  return { title: obj.title.trim(), sections };
}
