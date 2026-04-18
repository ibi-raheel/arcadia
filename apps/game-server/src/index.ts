import { createServer } from 'http';
import express from 'express';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';
import { monitor } from '@colyseus/monitor';
import { RealmRoom } from './rooms/RealmRoom';

const PORT = Number(process.env.PORT ?? 2567);
const REDIS_URL = process.env.REDIS_URL;

const app = express();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: '@arcadia/game-server',
    time: new Date().toISOString(),
    redis: REDIS_URL ? 'configured' : 'not-configured',
  });
});

// Colyseus monitor (dev-only helper; gate behind an env flag in prod).
if (process.env.COLYSEUS_MONITOR === 'true') {
  app.use('/colyseus', monitor());
}

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
  presence: REDIS_URL ? new RedisPresence(REDIS_URL) : undefined,
  driver: REDIS_URL ? new RedisDriver(REDIS_URL) : undefined,
});

// Two rooms defined in TAD §5.1 — both use the same RealmRoom class for MVP.
gameServer.define('world-realm1', RealmRoom);
gameServer.define('tavern-realm1', RealmRoom);

gameServer.listen(PORT).then(() => {
  console.log(`[game-server] listening on :${PORT}`);
  console.log(`[game-server] redis: ${REDIS_URL ? 'on' : 'in-memory (no REDIS_URL)'}`);
});
