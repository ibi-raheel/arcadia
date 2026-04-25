import { describe, expect, it } from 'vitest';

import { SAGE_CARDS } from '../cards';

describe('SAGE_CARDS', () => {
  it('has exactly the four expected cards', () => {
    expect(SAGE_CARDS).toHaveLength(4);
    expect(SAGE_CARDS.map((c) => c.id)).toEqual([
      'academy',
      'square',
      'dashboard',
      'coworking',
    ]);
  });

  it('every card has all required fields populated', () => {
    for (const card of SAGE_CARDS) {
      expect(card.label.trim().length).toBeGreaterThan(0);
      expect(card.sigil.trim().length).toBeGreaterThan(0);
      expect(card.tagline.trim().length).toBeGreaterThan(0);
      expect(card.body.trim().length).toBeGreaterThan(0);
      expect(card.hint.trim().length).toBeGreaterThan(0);
    }
  });

  it('taglines stay short enough to fit a card front (≤ 60 chars)', () => {
    for (const card of SAGE_CARDS) {
      expect(card.tagline.length).toBeLessThanOrEqual(60);
    }
  });

  it('sigils are a single character', () => {
    for (const card of SAGE_CARDS) {
      expect(card.sigil).toHaveLength(1);
    }
  });
});
