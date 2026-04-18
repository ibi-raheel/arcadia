import { Room, type Client } from 'colyseus';

// Phase 0 scaffold. State schema, message handlers (MOVE / ENTER_BUILDING /
// LEAVE_BUILDING / UPDATE_LEVEL per TAD §5.3), and Supabase JWT auth
// (TAD §5.4) are wired in Phase 2.
export class RealmRoom extends Room {
  override maxClients = 50;

  override onCreate(_options: unknown) {
    // No state or handlers yet — added in Phase 2.
  }

  override onJoin(client: Client, _options: unknown) {
    console.log(`[${this.roomName}] join`, client.sessionId);
  }

  override onLeave(client: Client, _code?: number) {
    console.log(`[${this.roomName}] leave`, client.sessionId);
  }

  override onDispose() {
    console.log(`[${this.roomName}] disposed`);
  }
}
