import { Schema, type } from '@colyseus/schema';

/**
 * Per-tent Pomodoro state. The server is the source of truth for
 * `phase` + `endsAt`; clients tick the visual countdown locally
 * but never write the schema directly — they send START_POMODORO /
 * STOP_POMODORO messages and let the server advance.
 *
 * Phases:
 *   - `idle`  — no session running. Banner hidden.
 *   - `work`  — heads-down period. Lantern banner.
 *   - `break` — short rest. Verdigris banner.
 *
 * `cycle` increments each work-phase start so clients can render
 * "block 2 of 3" if they want; not used by the MVP banner.
 */
export type PomodoroPhase = 'idle' | 'work' | 'break';

export class PomodoroState extends Schema {
  /** 'idle' when no session running. Server advances on tick. */
  @type('string') phase: PomodoroPhase = 'idle';
  /** Unix-ms when the current phase ends. 0 when idle. */
  @type('number') endsAt = 0;
  /** 0 when idle. 1+ during a session — increments each work-phase. */
  @type('number') cycle = 0;
  /** Member id of the keeper who started this session. Empty when idle. */
  @type('string') startedBy = '';
  /** Total work-phases planned (defaults to 4 — classic Pomodoro
   *  block of 4 work + 3 short breaks + 1 long break). */
  @type('number') totalCycles = 0;
  /** Minutes per work phase. Defaults to 25. */
  @type('number') workMinutes = 25;
  /** Minutes per short break. Defaults to 5. */
  @type('number') breakMinutes = 5;
}
