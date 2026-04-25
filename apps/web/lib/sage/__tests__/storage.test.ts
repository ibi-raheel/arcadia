// Vitest cases for the sage's localStorage helpers. Mocks
// `window.localStorage` per test so we don't leak state.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadSageHistory, saveSageHistory } from '../storage';

const STORAGE_KEY = 'arcadia.sage.history';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem = (k: string): string | null => this.store.get(k) ?? null;
  setItem = (k: string, v: string): void => {
    this.store.set(k, v);
  };
  removeItem = (k: string): void => {
    this.store.delete(k);
  };
  clear = (): void => this.store.clear();
}

beforeEach(() => {
  const mem = new MemoryStorage();
  vi.stubGlobal('window', { localStorage: mem });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveSageHistory + loadSageHistory', () => {
  it('round-trips a simple conversation', () => {
    const history = [
      { role: 'user' as const, content: 'hello' },
      { role: 'assistant' as const, content: 'sit a moment, traveller' },
    ];
    saveSageHistory(history);
    const loaded = loadSageHistory();
    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.content).toBe('hello');
    expect(loaded[1]?.role).toBe('assistant');
  });

  it('returns [] when nothing is stored', () => {
    expect(loadSageHistory()).toEqual([]);
  });

  it('returns [] on malformed JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadSageHistory()).toEqual([]);
  });

  it('drops messages with bad shape', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { role: 'user', content: 'kept' },
        { role: 'invalid', content: 'dropped' },
        { role: 'assistant' /* no content */ },
        { role: 'assistant', content: 'kept too' },
      ]),
    );
    const loaded = loadSageHistory();
    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.content).toBe('kept');
    expect(loaded[1]?.content).toBe('kept too');
  });

  it('caps history at 30 messages on save', () => {
    const big = Array.from({ length: 50 }, (_, i) => ({
      role: 'user' as const,
      content: `msg ${i}`,
    }));
    saveSageHistory(big);
    const loaded = loadSageHistory();
    expect(loaded).toHaveLength(30);
    expect(loaded[0]?.content).toBe('msg 20'); // oldest 20 dropped
    expect(loaded[29]?.content).toBe('msg 49');
  });

  it('caps per-message length at 4000 chars', () => {
    const huge = 'x'.repeat(5000);
    saveSageHistory([{ role: 'user', content: huge }]);
    const loaded = loadSageHistory();
    expect(loaded[0]?.content.length).toBe(4000);
  });

  it('clears storage when given an empty array', () => {
    saveSageHistory([{ role: 'user', content: 'a' }]);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    saveSageHistory([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
