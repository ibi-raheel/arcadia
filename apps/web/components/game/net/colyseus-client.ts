// Thin wrapper around colyseus.js that handles connect + auth token passing
// + exponential-backoff reconnect, and exposes a typed `send` keyed by the
// shared `MSG` enum. The Colyseus client SDK is lazy-imported the first
// time `connectToRoom` runs so it doesn't bloat any server-rendered page.

import {
  MSG,
  type MessagePayloads,
  type MessageType,
  type RealmRoomState,
} from '@arcadia/shared';

// Colyseus's Room type is heavy (Schema generics) — we re-export a narrow
// slice the rest of the client actually uses.
type ColyseusRoom = {
  readonly state: RealmRoomState;
  readonly sessionId: string;
  send(type: string, payload: unknown): void;
  leave(consented?: boolean): Promise<number> | number | void;
  onLeave(callback: (code: number) => void): { clear: () => void };
  onError(callback: (code: number, message?: string) => void): { clear: () => void };
};

export type RoomName = 'world-realm1' | 'tavern-realm1';

export type ConnectOptions = {
  readonly endpoint: string;
  readonly roomName: RoomName;
  readonly accessToken: string;
  /** Fires on initial connect + every successful reconnect. */
  readonly onConnected: (room: ColyseusRoom) => void;
  /** Fires when the room drops (code) or a reconnect attempt fails. */
  readonly onDisconnected?: (code: number) => void;
  /** Fires after `maxReconnectAttempts` consecutive reconnect failures. */
  readonly onReconnectFailed?: (lastError: Error) => void;
  /** Default 5. Set to 0 to disable auto-reconnect. */
  readonly maxReconnectAttempts?: number;
};

export type ColyseusConnection = {
  readonly endpoint: string;
  readonly roomName: RoomName;
  isActive(): boolean;
  /**
   * Returns `true` if the message was handed to the SDK. `false` if we're
   * currently disconnected (caller may choose to queue/drop).
   */
  send<M extends MessageType>(type: M, payload: MessagePayloads[M]): boolean;
  /** Explicit leave — stops reconnect loop. Resolves when socket closed. */
  leave(): Promise<void>;
};

/**
 * Intentional leave code (Colyseus uses 1000 for clean close). Reconnect
 * only fires if `code !== INTENTIONAL_LEAVE_CODE`.
 */
export const INTENTIONAL_LEAVE_CODE = 1000;

/**
 * Exponential-backoff delay for the `attempt`-th reconnect. Clamped at
 * `RECONNECT_MAX_DELAY_MS`. Exported for unit testing.
 *
 * attempt 0 → 1000 ms
 * attempt 1 → 2000
 * attempt 2 → 4000
 * attempt 3 → 8000
 * attempt 4 → 16000
 * attempt 5+ → 30000 (clamp)
 */
export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_DELAY_MS = 30000;
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

export function calculateReconnectDelayMs(attempt: number): number {
  if (attempt < 0) return RECONNECT_BASE_MS;
  const raw = RECONNECT_BASE_MS * 2 ** attempt;
  return Math.min(raw, RECONNECT_MAX_DELAY_MS);
}

/**
 * Connects to the named room. Returns a live controller immediately — the
 * `onConnected` callback fires once the initial join resolves, and again
 * after every successful auto-reconnect.
 *
 * Disconnects with code === INTENTIONAL_LEAVE_CODE do not trigger
 * reconnect. All other codes schedule a retry with `calculateReconnectDelayMs`.
 */
export async function connectToRoom(opts: ConnectOptions): Promise<ColyseusConnection> {
  const { Client } = await import('colyseus.js');
  const client = new Client(opts.endpoint);
  const maxAttempts = opts.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;

  let currentRoom: ColyseusRoom | null = null;
  let intentionallyLeft = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async function join(): Promise<ColyseusRoom> {
    // joinOrCreate returns a Room with full Schema generics; the narrow
    // ColyseusRoom slice is the only surface the rest of the client touches.
    const room = (await client.joinOrCreate(opts.roomName, {
      accessToken: opts.accessToken,
    })) as unknown as ColyseusRoom;

    room.onLeave((code) => {
      const wasRoom = room === currentRoom;
      if (!wasRoom) return;
      currentRoom = null;
      opts.onDisconnected?.(code);
      if (intentionallyLeft || code === INTENTIONAL_LEAVE_CODE) return;
      scheduleReconnect();
    });

    return room;
  }

  function scheduleReconnect(): void {
    if (intentionallyLeft) return;
    if (reconnectAttempt >= maxAttempts) {
      opts.onReconnectFailed?.(new Error('max reconnect attempts exceeded'));
      return;
    }
    const delay = calculateReconnectDelayMs(reconnectAttempt);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void attemptReconnect();
    }, delay);
  }

  async function attemptReconnect(): Promise<void> {
    try {
      const room = await join();
      currentRoom = room;
      reconnectAttempt = 0; // reset on success
      opts.onConnected(room);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      opts.onDisconnected?.(-1);
      if (reconnectAttempt >= maxAttempts) {
        opts.onReconnectFailed?.(error);
        return;
      }
      scheduleReconnect();
    }
  }

  // Initial connect — thrown errors propagate to the caller so they can
  // surface a "couldn't join" UI rather than entering the reconnect loop
  // for a first-try failure (typically bad auth or offline).
  currentRoom = await join();
  opts.onConnected(currentRoom);

  return {
    endpoint: opts.endpoint,
    roomName: opts.roomName,
    isActive: () => currentRoom !== null,
    send: (type, payload) => {
      if (!currentRoom) return false;
      currentRoom.send(type, payload);
      return true;
    },
    leave: async () => {
      intentionallyLeft = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      const room = currentRoom;
      currentRoom = null;
      if (room) await room.leave(true);
    },
  };
}

// Re-export so consumers can do `conn.send(MSG.MOVE, {...})` with full
// type inference on the payload.
export { MSG };
