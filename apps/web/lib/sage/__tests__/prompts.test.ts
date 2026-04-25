import { describe, expect, it } from 'vitest';

import { SAGE_GREETING, SAGE_SYSTEM_PERSONA, buildSageSystem } from '../prompts';

describe('SAGE_SYSTEM_PERSONA', () => {
  it('uses "traveller" as the default address', () => {
    expect(SAGE_SYSTEM_PERSONA).toContain('traveller');
  });

  it('forbids AI-preamble phrases', () => {
    // The persona explicitly mentions phrases the sage should NOT use.
    expect(SAGE_SYSTEM_PERSONA).toContain('Certainly!');
  });

  it('binds the sage to Arcadia only', () => {
    expect(SAGE_SYSTEM_PERSONA).toContain('only Arcadia');
  });

  it('caps replies short by default', () => {
    expect(SAGE_SYSTEM_PERSONA).toMatch(/120 words/i);
  });
});

describe('buildSageSystem', () => {
  it('places persona before doctrine', () => {
    const built = buildSageSystem('CORPUS_TEXT');
    expect(built.indexOf('Wanderer')).toBeLessThan(built.indexOf('Doctrine'));
  });

  it('appends the corpus text in full', () => {
    const built = buildSageSystem('CORPUS_TEXT');
    expect(built).toContain('CORPUS_TEXT');
  });

  it('has a clearly-marked doctrine boundary', () => {
    const built = buildSageSystem('x');
    expect(built).toMatch(/=== Doctrine/);
  });
});

describe('SAGE_GREETING', () => {
  it('addresses the visitor as a traveller', () => {
    expect(SAGE_GREETING.toLowerCase()).toContain('traveller');
  });

  it('mentions multiple Arcadia regions', () => {
    expect(SAGE_GREETING).toContain('academy');
    expect(SAGE_GREETING).toContain('tavern');
    expect(SAGE_GREETING).toContain('market');
  });
});
