# Arcadia — Technical Architecture Document

**MVP Edition | Version 1.1 | April 2026**

*Architecture for the 5-surface MVP: World, Tavern, Academy, Market, Creator Dashboard.*

*Changes in v1.1 vs v1.0 are summarised at the end of this document.*

## 1. Architecture overview

The Arcadia MVP runs across three independently deployed services. They have distinct responsibilities and must not be conflated. Communication between them follows fixed contracts defined below.

```
BROWSER CLIENT
┌────────────────────────────────────────────────────────┐
│ Next.js shell (React + Tailwind CSS)                   │
│ ┌──────────────────┐  ┌────────────────────────────┐  │
│ │ Phaser 3 canvas  │  │ React pages                │  │
│ │ /world           │  │ /tavern /academy /market   │  │
│ │ (game engine)    │  │ /dashboard /onboarding     │  │
│ └────────┬─────────┘  └─────────────┬──────────────┘  │
└──────────┼──────────────────────────┼─────────────────┘
           │ WebSocket                │ HTTPS + Realtime WS
           ▼                          ▼
┌──────────────────────┐   ┌────────────────────────────┐
│ Colyseus (Railway)   │   │ Supabase                   │
│ Avatar positions     │   │ ├─ Postgres + RLS          │
│ World presence       │◄──┤ ├─ Auth (email + Google)   │
│ Tavern presence      │   │ ├─ Realtime (chat, XP)     │
│ UPDATE_LEVEL sync    │   │ └─ Storage (thumbnails)    │
└──────────────────────┘   └────────────────────────────┘
                                       │
                           ┌───────────┴─────────────┐
                           │ Cloudflare Stream       │
                           │ Video upload + HLS      │
                           └─────────────────────────┘
```

### 1.1 Service responsibilities

| Service | Deployed on | Owns | Does NOT own |
|---|---|---|---|
| Next.js | Vercel | All pages, API routes, React UI, Phaser canvas mount | Game state, avatar positions |
| Colyseus | Railway | Avatar x / y / direction / level, room presence, movement sync | Chat history, user profiles, course data |
| Supabase | Supabase Cloud | All persistent data, auth, chat, XP, course content, level source of truth | Real-time avatar positions |

## 2. Technology stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| Web framework | Next.js | 14+ | SSR for Market / Academy; API routes for CF Stream + auth; React ecosystem |
| Game engine | Phaser 3 | 3.88+ | Best browser-native 2D engine; WebGL + Canvas fallback; tilemap + sprite system |
| Multiplayer | Colyseus | 0.16.x (server + client matched — see ADR 0005) | Room-based WS state sync; TypeScript schema; scales with Redis |
| Database & auth | Supabase | Latest | Postgres + Auth + Realtime + Storage; RLS for data isolation |
| UI | Tailwind CSS | 3+ | Utility-first; clean with Next.js / React |
| Video | Cloudflare Stream | Latest | Adaptive-bitrate HLS; global CDN; signed playback URLs |
| Language | TypeScript | 5+ | Shared types across Next.js, Colyseus, and Supabase client layers |
| Deployment | Vercel + Railway | Latest | Vercel: Next.js zero-config. Railway: WebSocket-friendly always-on Node.js |

Codebase layout is a monorepo: `/apps/web` (Next.js), `/apps/game-server` (Colyseus), `/packages/shared` (TypeScript types). The repo is already structured this way — each folder has its own `CONTEXT.md`. See `CLAUDE.md` for the routing table.

## 3. Frontend architecture

### 3.1 Page map

| Route | Rendering | Zone | Auth |
|---|---|---|---|
| `/` | SSG | Landing / Realm entry | Public |
| `/onboarding/avatar` | CSR | First-login avatar picker | Member |
| `/world` | CSR (ssr:false) | World — Phaser canvas | Member |
| `/tavern` | CSR | Tavern — chat + avatars | Member |
| `/academy` | SSR | Academy — course list | Member |
| `/academy/[courseId]` | CSR | Course viewer | Member |
| `/market` | SSR | Market — course catalogue | Member |
| `/dashboard` | CSR | Creator dashboard | Creator role |
| `/api/stream/upload` | API route | CF Stream pre-signed URL | Creator |
| `/api/stream/token` | API route | CF Stream signed playback URL | Member |
| `/api/stream/webhook` | API route | CF Stream transcode-complete callback | Cloudflare (verified signature) |

### 3.2 Phaser canvas mounting

Phaser depends on `window`, `canvas`, and WebGL — none of which exist on the server. Mount the game canvas as a dynamic import with SSR disabled:

```tsx
// app/world/page.tsx
import dynamic from 'next/dynamic';

const GameWorld = dynamic(
  () => import('@/components/game/GameWorld'),
  { ssr: false, loading: () => <WorldLoadingScreen /> }
);
```

*Never import Phaser in any file that Next.js may server-render. The `ssr: false` wrapper is non-negotiable — violating this will crash the build.*

### 3.3 Entry gate

On every page load under `/world` or `/tavern`, the client checks the current user's `memberships.avatar_id`. If null, redirect to `/onboarding/avatar` before mounting the Phaser canvas. This check lives in a route middleware or a top-level layout component; it runs before Colyseus connection begins.

### 3.4 State separation

| State type | Owner | Access pattern | Example data |
|---|---|---|---|
| Game state | Colyseus | Colyseus client SDK inside Phaser scene | Avatar x / y, direction, who is in the room |
| App state | Supabase | Supabase client SDK in React context | Member profile, XP, enrolled courses |
| UI state | React (`useState`) | Local component state | Modal open/close, form inputs, tab selection |

*If Colyseus data is being stored in React state, or Supabase is being called from inside a Phaser scene, the architecture is drifting. Keep these three layers strictly separated.*

## 4. Game engine — Phaser 3

### 4.1 Isometric approach

Phaser 3 has no native isometric renderer. The MVP uses orthographic tilemaps with isometric-style sprites (2:1 pixel ratio tiles, e.g. 64×32 px). Y-sorting creates the depth illusion. This avoids custom projection math while producing a convincing isometric look.

| Element | Approach |
|---|---|
| Tile size | 64×32 px tiles at 2:1 ratio — standard isometric diamond grid |
| Tilemap | Tiled editor (`.tmj` format); loaded via Phaser's built-in tilemap loader |
| Depth / y-sort | All game objects sorted by `(y + height/2)` every frame — objects lower on screen render in front |
| Buildings | Decorative sprites placed as static objects; entrance zones are invisible Phaser overlap rectangles |
| Camera | Follows local avatar; clamped to world bounds; smooth lerp on movement |

### 4.2 Scene map

| Phaser scene | Route | Colyseus room | Notes |
|---|---|---|---|
| BootScene | All game pages | — | Asset preload; Colyseus handshake; auth token validation |
| WorldScene | `/world` | `world-realm1` | Isometric world; avatar movement; building entry detection |
| TavernScene | `/tavern` | `tavern-realm1` | Image-backed interior (1536×1024); remote avatar sync; chat UI is React overlay |
| AcademyScene | `/academy` | — | Phase 3.5 addition (2026-04-20). Image-backed interior (1536×1024); **single-player**; clickable course podiums route to the React course viewer at `/academy/[courseId]` |

> **MVP amendment (2026-04-20):** Original TAD said "Academy and Market are pure React pages — no Phaser scene." Phase 3.5 added **AcademyScene** so members walk the hall instead of seeing a grid. Market stays React-only. The course viewer at `/academy/[courseId]` is still React — only the entry / browse surface is a Phaser scene.

### 4.3 Avatar system

- V1 avatar set: 8 base characters × 4 directions × 4 walk frames = sprite sheets per character
- Avatar selected on first login via `/onboarding/avatar`; value stored in `memberships.avatar_id`
- Display name text object above sprite; clipped to 16 characters; white with dark outline
- Level badge: small coloured circle below display name showing current level (1–5)
- Remote avatars: position received from Colyseus patch, interpolated client-side for smooth movement
- Local avatar: input captured in WorldScene; MOVE message sent to Colyseus at 20 updates/second

## 5. Multiplayer — Colyseus

### 5.1 Room types

| Room | ID pattern | State | Max players (MVP) |
|---|---|---|---|
| World | `world-realm1` | Avatar positions + presence for all members in the world | 50 (tested to 20 in Phase 2) |
| Tavern | `tavern-realm1` | Avatar positions for members currently in the Tavern | 50 (tested to 20 in Phase 2) |

### 5.2 State schema

```ts
import { Schema, type, MapSchema } from '@colyseus/schema';

class AvatarState extends Schema {
  @type('string') memberId: string;
  @type('string') displayName: string;
  @type('string') avatarId: string;
  @type('number') x: number;
  @type('number') y: number;
  @type('string') direction: AvatarDirection; // 'n' | 'e' | 's' | 'w' (cardinal; amended 2026-04-19)
  @type('boolean') isMoving: boolean;
  @type('number') level: number; // 1–5, sourced from Supabase on join, updated via UPDATE_LEVEL
}

class RealmRoomState extends Schema {
  @type({ map: AvatarState }) avatars = new MapSchema<AvatarState>();
}
```

### 5.3 Message protocol

| Message | Direction | Payload | Effect |
|---|---|---|---|
| MOVE | Client → Server | `{ x, y, direction, isMoving }` | Server validates bounds; updates AvatarState; auto-patches all clients |
| ENTER_BUILDING | Client → Server | `{ building: 'tavern' \| 'academy' \| 'market' }` | Server logs transition; client navigates to Next.js route |
| LEAVE_BUILDING | Client → Server | `{ building }` | Server removes building presence; client returns to `/world` |
| UPDATE_LEVEL | Client → Server | `{ level: number }` | Server validates 1 ≤ level ≤ 5; updates the caller's AvatarState.level so other clients see the new badge in real time |

*Colyseus handles avatar sync and level-badge broadcast only. Chat messages go through Supabase Realtime, not Colyseus. Never route chat through the game server.*

### 5.4 Auth on room join

```ts
// server/rooms/RealmRoom.ts
async onAuth(client, options, request) {
  const { data: { user }, error } = await supabaseAdmin
    .auth.getUser(options.accessToken);
  if (error || !user) throw new Error('Unauthorized');
  return user; // attached to client.auth in onJoin
}
```

*Optimisation note: this is a network call to Supabase Auth per room join. For MVP load (20 CCU target) this is acceptable. If room churn grows, switch to local JWT verification using the Supabase JWT secret.*

## 6. Database — Supabase

### 6.1 Schema (7 tables)

All tables include `realm_id` for future multi-Realm support. MVP has one hardcoded Realm (`slug = 'mvp-realm'`). All tables include `created_at` / `updated_at` for consistency and audit.

```sql
-- Realms (one row in MVP)
CREATE TABLE realms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  buildings JSONB, -- { tavern_name, academy_name, market_name }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per (realm, member)
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id UUID REFERENCES realms(id),
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id TEXT, -- null until first-login picker completes
  display_name TEXT,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(realm_id, member_id)
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id UUID REFERENCES realms(id),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  price_cents INT DEFAULT 0,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEW in v1.1: explicit sections table
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- denormalised for RLS speed
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT, -- 'video' | 'written'
  cf_stream_id TEXT, -- Cloudflare Stream video ID
  content TEXT, -- Markdown for written lessons
  sort_order INT NOT NULL DEFAULT 0,
  is_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  watched_secs INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, member_id)
);

-- NEW in v1.1: explicit enrolments table (manual inserts in MVP)
CREATE TABLE enrolments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id UUID REFERENCES realms(id),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, member_id)
);

CREATE TABLE tavern_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id UUID REFERENCES realms(id),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reactions JSONB DEFAULT '{}'::jsonb, -- { "🔥": ["memberIdA", "memberIdB"], ... }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 RLS policies (complete)

Every table has RLS enabled. Every SELECT, INSERT, UPDATE, DELETE is covered — Phase 0 exit is blocked until the cross-member leakage test passes against all of these.

```sql
-- realms: any authenticated member can read their realm row (needed for slug lookup)
CREATE POLICY realm_member_read ON realms FOR SELECT
  USING (id IN (SELECT realm_id FROM memberships WHERE member_id = auth.uid()));

-- memberships:
--   read:  own row, or any row in the same realm (for leaderboard / presence lookups)
--   update: own row only (for display_name, avatar_id)
--   insert / delete: service role only (via signup trigger)
CREATE POLICY membership_self_or_same_realm_read ON memberships FOR SELECT
  USING (
    member_id = auth.uid() OR
    realm_id IN (SELECT realm_id FROM memberships WHERE member_id = auth.uid())
  );
CREATE POLICY membership_self_update ON memberships FOR UPDATE
  USING (member_id = auth.uid());

-- courses: realm members can read; no client writes (creator uses service role via server)
CREATE POLICY course_member_read ON courses FOR SELECT
  USING (realm_id IN (SELECT realm_id FROM memberships WHERE member_id = auth.uid()));

-- sections: readable iff the parent course is readable
CREATE POLICY section_member_read ON sections FOR SELECT
  USING (course_id IN (SELECT id FROM courses));
  -- (courses SELECT already RLS-gated, so this chains)

-- lessons: preview lessons OR enrolled lessons
CREATE POLICY lesson_access ON lessons FOR SELECT
  USING (
    is_preview = TRUE OR
    course_id IN (SELECT course_id FROM enrolments WHERE member_id = auth.uid())
  );

-- lesson_progress: own rows only; inserts and updates gated to own member_id
CREATE POLICY progress_self_read ON lesson_progress FOR SELECT
  USING (member_id = auth.uid());
CREATE POLICY progress_self_write ON lesson_progress FOR INSERT
  WITH CHECK (member_id = auth.uid());
CREATE POLICY progress_self_update ON lesson_progress FOR UPDATE
  USING (member_id = auth.uid());

-- enrolments: own rows readable; inserts via service role only
CREATE POLICY enrolment_self_read ON enrolments FOR SELECT
  USING (member_id = auth.uid());

-- tavern_messages: members of the realm can read and write
CREATE POLICY chat_read ON tavern_messages FOR SELECT
  USING (realm_id IN (SELECT realm_id FROM memberships WHERE member_id = auth.uid()));
CREATE POLICY chat_write ON tavern_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    realm_id IN (SELECT realm_id FROM memberships WHERE member_id = auth.uid())
  );
CREATE POLICY chat_react ON tavern_messages FOR UPDATE
  USING (realm_id IN (SELECT realm_id FROM memberships WHERE member_id = auth.uid()))
  WITH CHECK (
    realm_id IN (SELECT realm_id FROM memberships WHERE member_id = auth.uid())
  );
-- (reactions column updated via RPC that validates only that column is changed)
```

**Cross-member leakage test (Phase 0 exit):** create two members in the same realm, confirm neither can read the other's `lesson_progress` or `enrolments`. Create a third member in a second test realm (temporarily, deleted after), confirm they cannot read any data belonging to realm 1.

### 6.3 Signup hook — auto-create membership

On every new `auth.users` insert, a trigger creates a `memberships` row in the hardcoded MVP realm with `avatar_id = NULL`. The first-login UI detects the null and routes to `/onboarding/avatar`.

```sql
CREATE OR REPLACE FUNCTION create_membership_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_realm_id UUID;
BEGIN
  SELECT id INTO v_realm_id FROM realms WHERE slug = 'mvp-realm' LIMIT 1;
  INSERT INTO memberships (realm_id, member_id, display_name)
  VALUES (v_realm_id, NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_membership_on_signup();
```

## 7. Video delivery — Cloudflare Stream

> **MVP amendment (2026-04-20 — ADR 0006):** Phase 3 uses **Cloudinary** instead of Cloudflare Stream. CF Stream has no free tier; Cloudinary's free tier (25 credits/month, no card) covers the Phase 3 demo with equivalent features (HLS adaptive streaming, signed URLs, auto-transcoding). The upload / playback flow shape below is preserved; only the vendor-specific bits change: `/api/stream/upload` → `/api/cloudinary/sign-upload`, `cf_stream_id` → `cloudinary_public_id` (both columns coexist in the `lessons` table for swap-back safety), and no webhook is used since Cloudinary's upload response carries `duration` synchronously. Swap-back path back to CF Stream is documented in ADR 0006. The original CF-Stream-shaped content below stays as the post-MVP target.


### 7.1 Upload flow

| Step | Who | What |
|---|---|---|
| 1 | Creator (browser) | Requests upload URL from `/api/stream/upload` |
| 2 | Next.js API route | Calls CF Stream API server-side to get a pre-signed TUS upload URL |
| 3 | Creator (browser) | Uploads video file directly to Cloudflare (browser → CF, not through Next.js) |
| 4 | Cloudflare | Transcodes video to multiple bitrates; webhooks when ready |
| 5 | Next.js webhook handler | `/api/stream/webhook` — verifies CF signature; saves `cf_stream_id` to `lessons` table via service-role client |

### 7.2 Playback flow

| Step | Who | What |
|---|---|---|
| 1 | Member (browser) | Requests lesson page; Next.js server-side fetches lesson from Supabase |
| 2 | Next.js page server | Calls CF Stream API to generate signed playback token (valid 1 hour) |
| 3 | Browser | Receives signed embed URL; Cloudflare Stream player renders video |
| 4 | Browser | `lesson_progress` upserted in Supabase as member watches |

*Never expose the raw Cloudflare Stream video ID to the browser without signing it. Always generate a server-side signed token. An unsigned stream ID can be played by anyone with the URL.*

## 8. Gamification architecture

### 8.1 Shared PL/pgSQL helpers

Level calculation and XP award are centralised in two functions. Every XP source calls `award_xp()`; every level calculation uses `calculate_level()`. This avoids logic drift across triggers.

```sql
CREATE OR REPLACE FUNCTION calculate_level(total_xp INT)
RETURNS INT AS $$
BEGIN
  RETURN CASE
    WHEN total_xp >= 1000 THEN 5
    WHEN total_xp >= 600  THEN 4
    WHEN total_xp >= 300  THEN 3
    WHEN total_xp >= 100  THEN 2
    ELSE 1
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION award_xp(
  p_member_id UUID,
  p_realm_id  UUID,
  p_amount    INT
) RETURNS VOID AS $$
BEGIN
  UPDATE memberships
  SET xp          = xp + p_amount,
      level       = calculate_level(xp + p_amount),
      last_active = NOW(),
      updated_at  = NOW()
  WHERE member_id = p_member_id
    AND realm_id  = p_realm_id;
END;
$$ LANGUAGE plpgsql;
```

### 8.2 XP event sources

All four sources call `award_xp()`. Rate-limiting for Tavern messages lives inside its trigger.

| XP event | Trigger | XP | Mechanism |
|---|---|---|---|
| Daily login | First `auth.signIn` of the calendar day | +10 | Edge Function on auth event; checks `last_active::date` vs `NOW()::date` |
| Lesson completed | `lesson_progress.completed` set TRUE | +25 | DB trigger on `lesson_progress` INSERT/UPDATE; calls `award_xp` |
| Course completed | All lessons in a course marked complete | +100 | Edge Function; checks completion percentage on lesson-completion event |
| Tavern message | `tavern_messages` INSERT | +5 | DB trigger; rate-limited to 10 per hour per member |

**Example trigger — lesson completion:**

```sql
CREATE OR REPLACE FUNCTION on_lesson_complete()
RETURNS TRIGGER AS $$
DECLARE v_realm_id UUID;
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    SELECT c.realm_id INTO v_realm_id
    FROM courses c JOIN lessons l ON l.course_id = c.id
    WHERE l.id = NEW.lesson_id;
    PERFORM award_xp(NEW.member_id, v_realm_id, 25);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lesson_complete
AFTER INSERT OR UPDATE ON lesson_progress
FOR EACH ROW EXECUTE FUNCTION on_lesson_complete();
```

### 8.3 Level sync: Supabase → Colyseus

Supabase is the source of truth for `level`. Colyseus holds a session-cached copy on `AvatarState.level` so other players see the updated badge without each one querying Supabase.

Flow:

1. XP event fires; `award_xp()` updates `memberships.level`.
2. The owning client is subscribed via Supabase Realtime to its own `memberships` row.
3. On `UPDATE` event where `new.level !== old.level`, the client sends `UPDATE_LEVEL { level }` to its current Colyseus room.
4. Colyseus validates `1 ≤ level ≤ 5` and updates `AvatarState.level` for the calling client; the patch propagates to all other clients in the room.
5. The Phaser scene listens for level changes on the local avatar and plays the level-up banner animation.

```ts
// client: inside React effect subscribed to own memberships row
supabase
  .channel('membership')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'memberships', filter: `member_id=eq.${userId}` },
    (payload) => {
      if (payload.new.level !== payload.old.level) {
        colyseusRoom?.send('UPDATE_LEVEL', { level: payload.new.level });
        eventBus.emit('level-up', payload.new.level); // Phaser listens for the banner
      }
    }
  )
  .subscribe();
```

```ts
// server: Colyseus room
onCreate() {
  this.onMessage('UPDATE_LEVEL', (client, { level }) => {
    if (typeof level !== 'number' || level < 1 || level > 5) return;
    const avatar = this.state.avatars.get(client.sessionId);
    if (avatar) avatar.level = level;
  });
}
```

## 9. Deployment

| Service | Platform | Config notes |
|---|---|---|
| Next.js | Vercel | Auto-deploy on push to main; preview deploys on PRs; serverless API routes |
| Colyseus | Railway | Always-on Node.js; WebSocket support native; env vars set in Railway dashboard |
| Supabase | Supabase Cloud | Single project; Pro plan (~$25/mo); PgBouncer connection pooling |
| Video | Cloudflare Stream | Pay-per-minute storage and delivery |
| Redis | Railway (add-on) | Required for Colyseus multi-process scaling; provision from Phase 0 |

### 9.1 Environment variables

| Variable | Server / client | Purpose |
|---|---|---|
| `SUPABASE_SERVICE_KEY` | Server only | Admin DB access for webhooks, signup trigger, analytics reads |
| `SUPABASE_JWT_SECRET` | Server only (Colyseus) | Local JWT verification (optimisation path; not used by default) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client safe | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client safe | Supabase anon key — RLS enforced |
| `CF_STREAM_TOKEN` | Server only | Cloudflare Stream API token for upload + signed URLs |
| `CF_ACCOUNT_ID` | Server only | Cloudflare account identifier |
| `CF_STREAM_WEBHOOK_SECRET` | Server only | Validates webhook signatures |
| `NEXT_PUBLIC_COLYSEUS_URL` | Client safe | WebSocket endpoint, e.g. `wss://your-server.railway.app` |
| `REDIS_URL` | Server only | Railway Redis connection string |

## 10. Changes in v1.1 vs v1.0

- **Schema:** added missing `sections` and `enrolments` tables; added `reactions` column to `tavern_messages`; added `last_active` + `display_name` + `created_at` / `updated_at` to `memberships`; added timestamps to all tables; removed the incorrect "5 tables" claim (there are 7)
- **RLS:** completed policy coverage for `realms`, `memberships`, `sections`, `lesson_progress`, `enrolments`, and additional insert/update policies for `tavern_messages`; added explicit cross-member leakage test criteria
- **Signup flow:** §6.3 added — database trigger auto-creates `memberships` row on `auth.users` INSERT
- **Avatar picker:** §3.3 added — first-login gate redirects members with null `avatar_id` to `/onboarding/avatar`; new page added to §3.1 page map
- **XP consolidation:** §8.1 added — `calculate_level()` and `award_xp()` shared functions; all four XP sources now call the same path
- **Level sync:** §8.3 added — explicit flow for propagating level changes from Supabase through the client to Colyseus via a new `UPDATE_LEVEL` message (§5.3)
- **Colyseus auth optimisation:** noted as a deferred optimisation (local JWT verification) — not MVP-required
- **Room capacity vs load test:** noted that 50 is the cap and 20 is the MVP test target
- **Monorepo layout:** made explicit — `/apps/web` + `/apps/game-server` + `/packages/shared`. The earlier `/src/*` placeholder in the repo has been retired in favor of this structure; routing table in `CLAUDE.md` updated accordingly

*— End of MVP TAD v1.1 —*
