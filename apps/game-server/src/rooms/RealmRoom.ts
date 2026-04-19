import { Room, type AuthContext, type Client } from 'colyseus';

import { MSG, RealmRoomState } from '@arcadia/shared';

import { supabaseAdmin } from '../lib/supabase-admin';
import { authenticateJoin, type AuthSupabase } from './realm-auth';
import { getRoomConfig } from './room-config';
import {
  applyMove,
  applyUpdateLevel,
  createAvatarState,
  parseBuildingPayload,
  type AuthInfo,
} from './realm-handlers';

// Phase 2 Step 2 — state + handlers wired. onAuth (JWT validation) lands in
// Step 3; until then this class relies on onAuth returning AuthInfo-shaped
// data (tests construct the AuthInfo directly).
export class RealmRoom extends Room<RealmRoomState> {
  override maxClients = 50;

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
