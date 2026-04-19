// Phase 2 Step 13 — live member-count badges above each building entrance.
//
// Data source: game-server `GET /rooms/:name/count` (added in
// apps/game-server/src/index.ts). Polled every `POLL_INTERVAL_MS` from the
// client; the room the local member is *already* connected to doesn't
// matter — the endpoint reads matchMaker presence globally.
//
// Ownership: one BadgeGroup per scene (WorldScene owns one; TavernScene
// could own its own later if it ever needed cross-room badges). Each
// BadgeGroup owns three Phaser Text objects — one per building entrance.

import type Phaser from 'phaser';

import type { BuildingName } from '../shared/types';
import { worldSpritesConfig } from './sprites.config';

export const POLL_INTERVAL_MS = 3000;

/**
 * Map building name → the Colyseus room name whose occupancy the badge
 * reflects. Phase 2 has a room only for the Tavern; Academy + Market stay
 * at zero until those get multiplayer (never, per TAD §4.2). Keeping them
 * in the map means the badges render uniformly — "0" is a valid count.
 */
export const BADGE_ROOM_BY_BUILDING: Record<BuildingName, string | null> = {
  tavern: 'tavern-realm1',
  academy: null,
  market: null,
};

/** Pure — maps count + label to the on-screen string. Unit-testable. */
export function formatBadgeText(count: number | null): string {
  if (count === null) return '—';
  if (count === 0) return '0';
  return String(count);
}

/** Build the HTTPS poll URL from the WSS endpoint the client already has. */
export function httpEndpointFor(wssEndpoint: string): string {
  return wssEndpoint.replace(/^ws/, 'http');
}

export type BadgeEntry = {
  readonly building: BuildingName;
  readonly text: Phaser.GameObjects.Text;
  /** Position the text above this pixel coord each frame. */
  readonly anchor: { readonly x: number; readonly y: number };
};

export type BadgeGroup = {
  entries: BadgeEntry[];
  stop: () => void;
};

export type CreateBadgesArgs = {
  readonly scene: Phaser.Scene;
  readonly anchors: Record<BuildingName, { readonly x: number; readonly y: number }>;
  readonly httpEndpoint: string;
  /** Inject a fetch implementation for testing. Defaults to globalThis.fetch. */
  readonly fetchImpl?: typeof fetch;
  readonly intervalMs?: number;
};

/**
 * Instantiate the three badge Texts and start polling. Returns a handle
 * whose `.stop()` cancels the poll and can be called from scene shutdown.
 */
export function createBadges(args: CreateBadgesArgs): BadgeGroup {
  const fetchImpl = args.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  const intervalMs = args.intervalMs ?? POLL_INTERVAL_MS;
  const entries: BadgeEntry[] = [];

  for (const building of ['tavern', 'academy', 'market'] as const) {
    const anchor = args.anchors[building];
    const text = args.scene.add
      .text(anchor.x, anchor.y - worldSpritesConfig.avatar.size.height / 2 - 16, '—', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.65)',
        padding: { left: 6, right: 6, top: 1, bottom: 1 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(1)
      .setDepth(10_000); // above the y-sort dynamic band
    entries.push({ building, text, anchor });
  }

  const roomNames = entries
    .map((e) => BADGE_ROOM_BY_BUILDING[e.building])
    .filter((n): n is string => n !== null);

  let cancelled = false;

  async function pollOnce(): Promise<void> {
    if (cancelled || !fetchImpl) return;
    // One fetch per known room. For three buildings that's 1 request
    // (only tavern has a room); stays cheap even if future buildings add.
    for (const roomName of roomNames) {
      try {
        const res = await fetchImpl(`${args.httpEndpoint}/rooms/${roomName}/count`);
        if (!res.ok) continue;
        const body = (await res.json()) as { name?: string; count?: number };
        if (typeof body.count !== 'number') continue;
        const building = buildingForRoom(roomName);
        if (!building) continue;
        const entry = entries.find((e) => e.building === building);
        if (entry) entry.text.setText(formatBadgeText(body.count));
      } catch {
        // Soft-fail — leave the previous value / "—". Network blips are
        // common on mobile; a single poll miss shouldn't clear the count.
      }
    }
    // Buildings without rooms render as "0" — static.
    for (const entry of entries) {
      if (BADGE_ROOM_BY_BUILDING[entry.building] === null) {
        entry.text.setText('0');
      }
    }
  }

  const intervalHandle = setInterval(() => void pollOnce(), intervalMs);
  // Fire once immediately so the first value isn't 3s stale.
  void pollOnce();

  return {
    entries,
    stop: () => {
      cancelled = true;
      clearInterval(intervalHandle);
      for (const e of entries) e.text.destroy();
      entries.length = 0;
    },
  };
}

function buildingForRoom(roomName: string): BuildingName | null {
  for (const [building, room] of Object.entries(BADGE_ROOM_BY_BUILDING) as Array<
    [BuildingName, string | null]
  >) {
    if (room === roomName) return building;
  }
  return null;
}
