import { createServer } from 'http';
import express, { type Request, type Response } from 'express';
import { matchMaker, Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';
import { monitor } from '@colyseus/monitor';
import { RealmRoom } from './rooms/RealmRoom';

const PORT = Number(process.env.PORT ?? 2567);
const HOST = process.env.HOST ?? '0.0.0.0';
const REDIS_URL = process.env.REDIS_URL;
// Redis presence/driver is only needed when running more than one Colyseus
// replica. MVP (20 CCU target, PRD §5) ships a single replica, so Redis is
// opt-in via USE_REDIS=true. Defaulting off avoids Server.listen() blocking on
// presence.onReady() / driver.onReady() when the Redis plugin isn't fully up.
const USE_REDIS = process.env.USE_REDIS === 'true' && Boolean(REDIS_URL);

console.log(
  `[game-server] boot — port=${PORT} host=${HOST} redis=${USE_REDIS ? 'on' : 'off (in-memory)'}`,
);

const app = express();

// Keep /health liveness-independent of Colyseus state so healthchecks always
// answer even if rooms or Redis are misbehaving.
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: '@arcadia/game-server',
    time: new Date().toISOString(),
    redis: REDIS_URL ? 'configured' : 'not-configured',
  });
});

// Phase 2 Step 13 — occupancy poll endpoint for the world's member-count
// badge. Unauthenticated; returns only a scalar client count per room name.
// Known rooms allow-listed so random names don't trigger matchMaker work.
const ROOM_NAMES = new Set(['world-realm1', 'tavern-realm1']);
app.get('/rooms/:name/count', async (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const name = req.params.name;
  if (!name || !ROOM_NAMES.has(name)) {
    res.status(404).json({ error: 'unknown room' });
    return;
  }
  try {
    const rooms = await matchMaker.query({ name });
    const count = rooms.reduce((sum, r) => sum + (r.clients ?? 0), 0);
    res.json({ name, count });
  } catch (err) {
    console.error(`[rooms/${name}/count] query failed:`, err);
    res.status(500).json({ error: 'query failed' });
  }
});

// CORS preflight for the count endpoint — browsers hit this from the Vercel
// origin when the Phaser client polls across origins.
app.options('/rooms/:name/count', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.status(204).end();
});

// Colyseus monitor (dev-only helper; gate behind an env flag in prod).
if (process.env.COLYSEUS_MONITOR === 'true') {
  app.use('/colyseus', monitor());
}

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
  presence: USE_REDIS && REDIS_URL ? new RedisPresence(REDIS_URL) : undefined,
  driver: USE_REDIS && REDIS_URL ? new RedisDriver(REDIS_URL) : undefined,
});

// Two rooms defined in TAD §5.1 — both use the same RealmRoom class for MVP.
gameServer.define('world-realm1', RealmRoom);
gameServer.define('tavern-realm1', RealmRoom);

// Bind explicitly to 0.0.0.0 so container platforms (Railway, Fly) can route
// to the service. Node's default is all interfaces, but being explicit avoids
// surprises when IPv6-only listeners are the default.
gameServer
  .listen(PORT, HOST)
  .then(() => {
    console.log(`[game-server] listening on ${HOST}:${PORT}`);
    console.log(`[game-server] presence: ${USE_REDIS ? 'redis' : 'in-memory'}`);
  })
  .catch((err: unknown) => {
    console.error('[game-server] listen failed:', err);
    process.exit(1);
  });

// Watchdog: if listen() hasn't resolved within 30s, log loudly. Helps diagnose
// future presence/driver hangs without having to ship another commit.
setTimeout(() => {
  if (!httpServer.listening) {
    console.error('[game-server] WATCHDOG: 30s elapsed and httpServer is still not listening');
  }
}, 30_000).unref();
