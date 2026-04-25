import { Room, type AuthContext, type Client } from 'colyseus';

import { MSG, RealmRoomState } from '@arcadia/shared';

import { supabaseAdmin } from '../lib/supabase-admin';
import { authenticateJoin, type AuthSupabase } from './realm-auth';
import { getRoomConfig } from './room-config';
import {
  applyMove,
  applySetFocus,
  applySetJukebox,
  applyStartPomodoro,
  applyStopPomodoro,
  applyUpdateLevel,
  createAvatarState,
  parseBuildingPayload,
  tickPomodoro,
  type AuthInfo,
} from './realm-handlers';

// Phase 2 Step 2 — state + handlers wired. onAuth (JWT validation) lands in
// Step 3; until then this class relies on onAuth returning AuthInfo-shaped
// data (tests construct the AuthInfo directly).
export class RealmRoom extends Room<RealmRoomState> {
  // 20-cap auto-shard (decided 2026-04-22): once a room hits 20 occupants,
  // Colyseus's matchmaker routes new joiners to the next room with the same
  // filter (or creates a fresh one). Applies to world / tavern / coworking.
  // See `docs/changelog/2026-04-22_image-backed-world.md` for the reasoning.
  override maxClients = 20;

  override onCreate(_options: unknown): void {
    this.setState(new RealmRoomState());

    const { bounds } = getRoomConfig(this.roomName);

    this.onMessage(MSG.MOVE, (client, payload) => {
      const avatar = this.state.avatars.get(client.sessionId);
      if (!avatar) return;
      if (!applyMove(avatar, payload, bounds)) {
        console.warn(`[${this.roomName}] rejected MOVE from ${client.sessionId}`);
      }
    });

    this.onMessage(MSG.UPDATE_LEVEL, (client, payload) => {
      const avatar = this.state.avatars.get(client.sessionId);
      if (!avatar) return;
      if (!applyUpdateLevel(avatar, payload)) {
        console.warn(`[${this.roomName}] rejected UPDATE_LEVEL from ${client.sessionId}`);
      }
    });

    this.onMessage(MSG.ENTER_BUILDING, (client, payload) => {
      const building = parseBuildingPayload(payload);
      if (!building) return;
      console.log(`[${this.roomName}] ${client.sessionId} ENTER_BUILDING ${building}`);
    });

    this.onMessage(MSG.LEAVE_BUILDING, (client, payload) => {
      const building = parseBuildingPayload(payload);
      if (!building) return;
      console.log(`[${this.roomName}] ${client.sessionId} LEAVE_BUILDING ${building}`);
    });

    // Phase 12 — coworking productivity messages. Only meaningful in
    // the coworking-realm1 room type, but the handlers are harmless
    // in other rooms (state.jukebox + state.pomodoro exist on every
    // RealmRoomState — they just go unused outside the tents).
    this.onMessage(MSG.SET_JUKEBOX, (client, payload) => {
      const avatar = this.state.avatars.get(client.sessionId);
      if (!avatar) return;
      applySetJukebox(this.state.jukebox, payload, avatar.memberId, Date.now());
    });

    this.onMessage(MSG.START_POMODORO, (client, payload) => {
      const avatar = this.state.avatars.get(client.sessionId);
      if (!avatar) return;
      applyStartPomodoro(this.state.pomodoro, payload, avatar.memberId, Date.now());
    });

    this.onMessage(MSG.STOP_POMODORO, () => {
      applyStopPomodoro(this.state.pomodoro);
    });

    this.onMessage(MSG.SET_FOCUS, (client, payload) => {
      const avatar = this.state.avatars.get(client.sessionId);
      if (!avatar) return;
      applySetFocus(avatar, payload);
    });

    // Server tick — once per second, advance pomodoro phases when
    // their `endsAt` passes. Cheap (only mutates when something is
    // actually due) and Colyseus only re-broadcasts on diff.
    this.clock.setInterval(() => {
      tickPomodoro(this.state.pomodoro, Date.now());
    }, 1000);
  }

  override async onAuth(
    _client: Client,
    options: unknown,
    context: AuthContext,
  ): Promise<AuthInfo> {
    const token = extractAccessToken(options, context);
    // supabase-js's typed query builder differs structurally from the narrow
    // AuthSupabase interface (PostgrestBuilder is thenable, not a Promise).
    // The interface captures exactly what this function needs at runtime;
    // the cast asserts the real client satisfies that subset.
    return authenticateJoin(token, supabaseAdmin as unknown as AuthSupabase);
  }

  override onJoin(client: Client, _options: unknown, auth: AuthInfo): void {
    console.log(`[${this.roomName}] join ${client.sessionId} member=${auth.memberId}`);
    const { spawn } = getRoomConfig(this.roomName);
    this.state.avatars.set(client.sessionId, createAvatarState(auth, spawn));
  }

  override onLeave(client: Client, _consented?: boolean): void {
    console.log(`[${this.roomName}] leave ${client.sessionId}`);
    this.state.avatars.delete(client.sessionId);
  }

  override onDispose(): void {
    console.log(`[${this.roomName}] disposed`);
  }
}

/**
 * Client can ship the Supabase JWT either as `options.accessToken` (what
 * the web client does in Step 5) or as an `Authorization: Bearer …` header
 * (picked up by Colyseus into `context.token`). Prefer options for clarity;
 * fall back to context.
 */
function extractAccessToken(options: unknown, context: AuthContext): string | undefined {
  if (options && typeof options === 'object') {
    const { accessToken } = options as { accessToken?: unknown };
    if (typeof accessToken === 'string' && accessToken.length > 0) return accessToken;
  }
  return context.token;
}
