import { describe, expect, it } from 'vitest';

import type { DraftSource } from '@/lib/types/course-drafts';

import {
  EMPTY_SOURCE_SENTINEL,
  IMAGE_STYLE_PREAMBLE,
  MAX_SOURCE_CONTEXT_CHARS,
  buildSourceContext,
  imagePrompt,
  lessonPrompt,
  outlinePrompt,
  parseOutlineJson,
} from '../prompts';

const makeSource = (filename: string, text: string): DraftSource => ({
  id: filename,
  filename,
  char_count: text.length,
  text,
  storage_path: `u/d/${filename}`,
});

describe('buildSourceContext', () => {
  it('returns null when no sources', () => {
    expect(buildSourceContext([])).toBeNull();
  });

  it('includes filename + content for each source', () => {
    const ctx = buildSourceContext([makeSource('a.pdf', 'alpha'), makeSource('b.txt', 'beta')]);
    expect(ctx).toContain('a.pdf');
    expect(ctx).toContain('alpha');
    expect(ctx).toContain('b.txt');
    expect(ctx).toContain('beta');
  });

  it('uses sentinel when a source has empty text', () => {
    const ctx = buildSourceContext([makeSource('scan.pdf', '')]);
    expect(ctx).toContain(EMPTY_SOURCE_SENTINEL);
  });

  it('truncates total content at the budget', () => {
    const big = 'x'.repeat(MAX_SOURCE_CONTEXT_CHARS + 1000);
    const ctx = buildSourceContext([makeSource('big.txt', big)]);
    // The header adds a few chars so we allow a small slack over the char budget.
    expect(ctx!.length).toBeLessThan(MAX_SOURCE_CONTEXT_CHARS + 200);
    expect(ctx).toContain('[truncated]');
  });

  it('drops later sources once the budget is gone and notes it', () => {
    const big = 'x'.repeat(MAX_SOURCE_CONTEXT_CHARS);
    const ctx = buildSourceContext([makeSource('big.txt', big), makeSource('small.txt', 'y')]);
    expect(ctx).toContain('big.txt');
    expect(ctx).toContain('additional sources omitted');
    expect(ctx).not.toContain('small.txt');
  });
});

describe('outlinePrompt', () => {
  it('includes the brief verbatim', () => {
    const { prompt } = outlinePrompt({
      userPrompt: 'beekeeping for beginners',
      sources: [],
    });
    expect(prompt).toContain('beekeeping for beginners');
  });

  it('embeds the source block when sources present', () => {
    const { prompt } = outlinePrompt({
      userPrompt: 'x',
      sources: [makeSource('notes.md', 'the queen lays')],
    });
    expect(prompt).toContain('notes.md');
    expect(prompt).toContain('the queen lays');
  });

  it('adds the revise framing when feedback given', () => {
    const { prompt } = outlinePrompt({
      userPrompt: 'x',
      sources: [],
      revisionFeedback: 'add a section on tools',
    });
    expect(prompt).toContain('add a section on tools');
    expect(prompt.toLowerCase()).toContain('revision');
  });

  it('asks for JSON output with the schema shape', () => {
    const { prompt } = outlinePrompt({ userPrompt: 'x', sources: [] });
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"sections"');
    expect(prompt).toContain('"lessons"');
  });

  it('injects creator preferences when present', () => {
    const { prompt } = outlinePrompt({
      userPrompt: 'x',
      sources: [],
      preferences: {
        voice_guide: 'plain-spoken, short sentences',
        image_style: null,
        audience: 'working designers',
      },
    });
    expect(prompt).toContain('plain-spoken, short sentences');
    expect(prompt).toContain('working designers');
    expect(prompt.toLowerCase()).toContain('teaching voice');
  });

  it('omits preferences block when nothing is set', () => {
    const { prompt } = outlinePrompt({
      userPrompt: 'x',
      sources: [],
      preferences: { voice_guide: null, image_style: null, audience: null },
    });
    expect(prompt.toLowerCase()).not.toContain('teaching voice');
  });
});

describe('lessonPrompt', () => {
  it('includes course, section, and lesson titles', () => {
    const { prompt } = lessonPrompt({
      courseTitle: 'Beekeeping',
      sectionTitle: 'Foundations',
      lessonTitle: 'Anatomy of a Hive',
      peerLessonTitles: [],
      userPrompt: '',
      sources: [],
    });
    expect(prompt).toContain('Beekeeping');
    expect(prompt).toContain('Foundations');
    expect(prompt).toContain('Anatomy of a Hive');
  });

  it('lists peer lessons when provided', () => {
    const { prompt } = lessonPrompt({
      courseTitle: 'x',
      sectionTitle: 'y',
      lessonTitle: 'z',
      peerLessonTitles: ['A', 'B'],
      userPrompt: '',
      sources: [],
    });
    expect(prompt).toContain('A');
    expect(prompt).toContain('B');
    expect(prompt).toMatch(/do not re-teach/i);
  });

  it('asks for markdown shape with word range and no preamble', () => {
    const { prompt } = lessonPrompt({
      courseTitle: 'x',
      sectionTitle: 'y',
      lessonTitle: 'z',
      peerLessonTitles: [],
      userPrompt: '',
      sources: [],
    });
    expect(prompt).toContain('400');
    expect(prompt).toMatch(/h3/i);
    expect(prompt.toLowerCase()).toContain('certainly');
  });
});

describe('imagePrompt', () => {
  it('starts with the locked style preamble', () => {
    const p = imagePrompt({
      target: 'thumbnail',
      courseTitle: 'c',
      subjectTitle: 's',
      subjectSummary: 'a hive at dawn',
    });
    expect(p.startsWith(IMAGE_STYLE_PREAMBLE)).toBe(true);
  });

  it('switches framing between thumbnail and lesson', () => {
    const thumb = imagePrompt({
      target: 'thumbnail',
      courseTitle: 'c',
      subjectTitle: 's',
      subjectSummary: 'x',
    });
    const lesson = imagePrompt({
      target: 'lesson',
      courseTitle: 'c',
      subjectTitle: 'lessTitle',
      subjectSummary: 'x',
    });
    expect(thumb).toContain('whole course');
    expect(lesson).toContain('lessTitle');
  });

  it('appends revision note when provided', () => {
    const p = imagePrompt({
      target: 'lesson',
      courseTitle: 'c',
      subjectTitle: 's',
      subjectSummary: 'x',
      revisionFeedback: 'more verdigris',
    });
    expect(p).toContain('more verdigris');
  });

  it("appends the creator's image_style preference to the preamble", () => {
    const p = imagePrompt({
      target: 'thumbnail',
      courseTitle: 'c',
      subjectTitle: 's',
      subjectSummary: 'x',
      preferences: {
        voice_guide: null,
        image_style: 'muted palette, no human faces',
        audience: null,
      },
    });
    expect(p).toContain('muted palette, no human faces');
    // Must still start with the locked preamble — personal style is
    // additive, not replacement.
    expect(p.startsWith(IMAGE_STYLE_PREAMBLE)).toBe(true);
  });
});

describe('parseOutlineJson', () => {
  const goodJson = JSON.stringify({
    title: 'A Course',
    sections: [
      {
        title: 'First',
        lessons: [{ title: 'Lesson A' }, { title: 'Lesson B' }],
      },
      {
        title: 'Second',
        lessons: [{ title: 'Lesson C' }],
      },
    ],
  });

  it('parses a well-formed response', () => {
    const result = parseOutlineJson(goodJson);
    expect(result.title).toBe('A Course');
    expect(result.sections).toHaveLength(2);
    const firstSection = result.sections[0];
    if (!firstSection) throw new Error('expected first section');
    expect(firstSection.id).toBe('s1');
    const secondLesson = firstSection.lessons[1];
    if (!secondLesson) throw new Error('expected second lesson');
    expect(secondLesson.id).toBe('l1_2');
  });

  it('strips markdown fences Claude sometimes wraps around JSON', () => {
    const wrapped = '```json\n' + goodJson + '\n```';
    const result = parseOutlineJson(wrapped);
    expect(result.title).toBe('A Course');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseOutlineJson('not json')).toThrow(/not valid JSON/);
  });

  it('throws when sections missing', () => {
    expect(() => parseOutlineJson(JSON.stringify({ title: 'x' }))).toThrow(
      /missing title or sections/,
    );
  });
});
