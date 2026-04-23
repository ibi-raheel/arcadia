// Thin wrapper around colyseus.js that handles connect + auth token passing
// + exponential-backoff reconnect, and exposes a typed `send` keyed by the
// shared `MSG` enum. The Colyseus client SDK is lazy-imported the first
// time `connectToRoom` runs so it doesn't bloat any server-rendered page.

import {
  MSG,
  type MessagePayloads,
  type MessageType,
  type RealmRoomState,
  type AvatarState,
} from '@arcadia/shared';

// Narrow slice of colyseus.js's Room the rest of the client touches.
// Full Room type is heavily generic over Schema; this surface is enough
// for state subscription + send + leave + lifecycle events.
export type ColyseusRoom = {
  readonly state: RealmRoomState;
  readonly sessionId: string;
  send(type: string, payload: unknown): void;
  leave(consented?: boolean): Promise<number> | number | void;
  onLeave(callback: (code: number) => void): { clear: () => void };
  onError(callback: (code: number, message?: string) => void): { clear: () => void };
};

export type { AvatarState, RealmRoomState };

export type RoomName = 'world-realm1' | 'tavern-realm1' | 'coworking-realm1';

export type ConnectOptions = {
  readonly endpoint: string;
  readonly roomName: RoomName;
  readonly accessToken: string;
  /**
   * Per-building sharding key. Passed to Colyseus `joinOrCreate` as an option
   * so rooms defined with `.filterBy(['building'])` group clients with the
   * same value. Required for `tavern-realm1` + `coworking-realm1`; omit (or
   * ignored) for `world-realm1` which isn't filtered.
   */
  readonly building?: string;
  /** Fires after `maxReconnectAttempts` consecutive reconnect failures. */
  readonly onReconnectFailed?: (lastError: Error) => void;
  /** Fires each time the socket drops (before any reconnect attempt). */
  readonly onDisconnected?: (code: number) => void;
  /** Default 5. Set to 0 to disable auto-reconnect. */
  readonly maxReconnectAttempts?: number;
};

export type ColyseusConnection = {
  readonly endpoint: string;
  readonly roomName: RoomName;
  /** Current room, or null when disconnected. Prefer `subscribeConnected` for reactivity. */
  getCurrentRoom(): ColyseusRoom | null;
  /**
   * Subscribe to room-connect events. Fires **immediately** with the
   * current room if one is already connected (consumer can register after
   * `connectToRoom` resolves and still receive the initial connect), AND
   * fires on every successful auto-reconnect. Returns an unsubscribe fn.
   */
  subscribeConnected(callback: (room: ColyseusRoom) => void): () => void;
  isActive(): boolean;
  /** Returns `true` if the message was handed to the SDK, `false` if offline. */
  send<M extends MessageType>(type: M, payload: MessagePayloads[M]): boolean;
  /** Explicit leave — stops reconnect loop. Resolves when socket closed. */
  leave(): Promise<void>;
};

export const INTENTIONAL_LEAVE_CODE = 1000;

export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_DELAY_MS = 30000;
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

export function calculateReconnectDelayMs(attempt: number): number {
  if (attempt < 0) return RECONNECT_BASE_MS;
  const raw = RECONNECT_BASE_MS * 2 ** attempt;
  return Math.min(raw, RECONNECT_MAX_DELAY_MS);
}

/**
 * Connects to the named room and returns a live controller. The initial
 * join resolves before this function returns — use `subscribeConnected` to
 * wire state handlers that also need to re-run on reconnect.
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
  const listeners = new Set<(room: ColyseusRoom) => void>();

  function notifyConnected(room: ColyseusRoom): void {
    for (const cb of Array.from(listeners)) {
      try {
        cb(room);
      } catch (err) {
        console.error('subscribeConnected callback threw:', err);
      }
    }
  }

  async function join(): Promise<ColyseusRoom> {
    const joinOptions: Record<string, string> = { accessToken: opts.accessToken };
    if (opts.building != null) joinOptions.building = opts.building;
    const room = (await client.joinOrCreate(opts.roomName, joinOptions)) as unknown as ColyseusRoom;

    room.onLeave((code) => {
      if (room !== currentRoom) return;
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
      reconnectAttempt = 0;
      notifyConnected(room);
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

  return {
    endpoint: opts.endpoint,
    roomName: opts.roomName,
    getCurrentRoom: () => currentRoom,
    subscribeConnected: (callback) => {
      listeners.add(callback);
      if (currentRoom) {
        // Fire immediately so late subscribers (e.g. WorldScene.create())
        // don't miss the initial connect.
        try {
          callback(currentRoom);
        } catch (err) {
          console.error('subscribeConnected callback threw:', err);
        }
      }
      return () => {
        listeners.delete(callback);
      };
    },
    isActive: () => currentRoom !== null,
    send: (type, payload) => {
      if (!currentRoom) return false;
      currentRoom.send(type, payload);
      return true;
    },
    leave: async () => {
      intentionallyLeft = true;
      listeners.clear();
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

export { MSG };
