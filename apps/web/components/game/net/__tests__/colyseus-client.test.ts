import { describe, expect, it } from 'vitest';

import {
  calculateReconnectDelayMs,
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  INTENTIONAL_LEAVE_CODE,
  RECONNECT_BASE_MS,
  RECONNECT_MAX_DELAY_MS,
} from '../colyseus-client';

describe('calculateReconnectDelayMs', () => {
  it('attempt 0 → RECONNECT_BASE_MS', () => {
    expect(calculateReconnectDelayMs(0)).toBe(RECONNECT_BASE_MS);
  });

  it('doubles each attempt until clamp', () => {
    expect(calculateReconnectDelayMs(1)).toBe(2000);
    expect(calculateReconnectDelayMs(2)).toBe(4000);
    expect(calculateReconnectDelayMs(3)).toBe(8000);
    expect(calculateReconnectDelayMs(4)).toBe(16000);
  });

  it('clamps to RECONNECT_MAX_DELAY_MS past attempt 5', () => {
    expect(calculateReconnectDelayMs(5)).toBe(RECONNECT_MAX_DELAY_MS);
    expect(calculateReconnectDelayMs(6)).toBe(RECONNECT_MAX_DELAY_MS);
    expect(calculateReconnectDelayMs(20)).toBe(RECONNECT_MAX_DELAY_MS);
  });

  it('guards against negative attempt', () => {
    expect(calculateReconnectDelayMs(-1)).toBe(RECONNECT_BASE_MS);
    expect(calculateReconnectDelayMs(-100)).toBe(RECONNECT_BASE_MS);
  });
});

describe('protocol constants', () => {
  it('INTENTIONAL_LEAVE_CODE matches Colyseus clean-close convention (1000)', () => {
    // Pinning so accidental changes break the suite — the reconnect loop
    // in connectToRoom relies on this exact value to distinguish a
    // deliberate leave() from a network drop.
    expect(INTENTIONAL_LEAVE_CODE).toBe(1000);
  });

  it('DEFAULT_MAX_RECONNECT_ATTEMPTS matches plan (5)', () => {
    expect(DEFAULT_MAX_RECONNECT_ATTEMPTS).toBe(5);
  });
});
