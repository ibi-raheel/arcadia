// Mirrors GameTavern for /world. Fetches session + member, opens the
// `world-realm1` Colyseus room (auto-sharded at maxClients=20), mounts
// Phaser with [BootScene, SquareScene]. Replaces `GameWorldSquareV3` at
// /world as of 2026-04-22 — the ADR-0007 Tiled scene stays on disk but is
// no longer routed.

'use client';

import * as Phaser from 'phaser';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { SageFeatures } from '@/components/sage/SageFeatures';
import type { PhaserGameLike } from '@/components/tavern/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { BuildingTransition } from './BuildingTransition';
import { LevelUpBanner } from './LevelUpBanner';
import { PlayerHud } from '@/components/hud/PlayerHud';
import { useLevelSync } from './net/use-level-sync';
import { connectToRoom, type ColyseusConnection } from './net/colyseus-client';
import { BootScene } from './scenes/boot/BootScene';
import {
  NEXT_SCENE_KEY_REGISTRY_KEY,
  PROGRESS_CALLBACK_REGISTRY_KEY,
} from './scenes/boot/asset-manifest';
import { isAvatarId, type AvatarId } from './scenes/shared/avatar-palette';
import { squareCameraConfig } from './scenes/square/camera.config';
import {
  SquareScene,
  SQUARE_SCENE_KEY,
  SQUARE_SPAWN_OVERRIDE_REGISTRY_KEY,
} from './scenes/square/SquareScene';
import { SQUARE_RETURN_SPAWNS } from './scenes/square/sprites.config';
import {
  COLYSEUS_CONNECTION_REGISTRY_KEY,
  MEMBER_REGISTRY_KEY,
  type SceneMember,
} from './scenes/world/WorldScene';

const COLYSEUS_ENDPOINT = process.env.NEXT_PUBLIC_COLYSEUS_URL ?? '';

type SessionFetch =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; member: SceneMember; accessToken: string };

async function fetchSession(): Promise<SessionFetch> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return { status: 'error', message: sessionError?.message ?? 'Not signed in.' };
  }
  const { data, error } = await supabase
    .from('memberships')
    .select('avatar_id, display_name, realm_id, xp')
    .eq('member_id', session.user.id)
    .maybeSingle();
  if (error) return { status: 'error', message: error.message };
  if (!data?.avatar_id) return { status: 'error', message: 'No avatar selected.' };
  if (!isAvatarId(data.avatar_id)) {
    return { status: 'error', message: `Invalid avatar_id "${data.avatar_id}".` };
  }
  if (!data.realm_id) {
    return { status: 'error', message: 'No realm for member.' };
  }
  const avatarId: AvatarId = data.avatar_id;
  const displayName = data.display_name ?? 'Player';
  const xp = typeof data.xp === 'number' ? data.xp : 0;
  return {
    status: 'ready',
    member: {
      memberId: session.user.id,
      realmId: data.realm_id,
      avatarId,
      displayName,
      xp,
    },
    accessToken: session.access_token,
  };
}

export default function GameSquare(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const connectionRef = useRef<ColyseusConnection | null>(null);
  const [fetchState, setFetchState] = useState<SessionFetch>({ status: 'loading' });
  const [connectError, setConnectError] = useState<string | null>(null);
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);
  const [colyseusConn, setColyseusConn] = useState<ColyseusConnection | null>(null);

  // Re-entry continuity: `?from=<origin>` spawns the avatar at the bridge
  // they just walked through instead of the default centre spawn.
  const searchParams = useSearchParams();
  const spawnOverride = useMemo(() => {
    const from = searchParams.get('from');
    return from ? SQUARE_RETURN_SPAWNS[from] : undefined;
  }, [searchParams]);

  useLevelSync({
    memberId: fetchState.status === 'ready' ? fetchState.member.memberId : null,
    colyseus: colyseusConn,
  });

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((r) => {
      if (!cancelled) setFetchState(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      fetchState.status !== 'ready' ||
      !containerRef.current ||
      gameRef.current ||
      !COLYSEUS_ENDPOINT
    ) {
      if (fetchState.status === 'ready' && !COLYSEUS_ENDPOINT) {
        setConnectError('NEXT_PUBLIC_COLYSEUS_URL is not configured');
      }
      return;
    }

    let cancelled = false;

    (async () => {
      let connection: ColyseusConnection;
      try {
        connection = await connectToRoom({
          endpoint: COLYSEUS_ENDPOINT,
          roomName: 'world-realm1',
          accessToken: fetchState.accessToken,
          onReconnectFailed: (err) => {
            if (!cancelled) setConnectError(err.message);
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) setConnectError(message);
        return;
      }

      if (cancelled) {
        await connection.leave();
        return;
      }

      connectionRef.current = connection;
      setColyseusConn(connection);

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        backgroundColor: '#0b1220',
        pixelArt: true,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scale: {
          mode: Phaser.Scale.RESIZE,
          width: squareCameraConfig.bounds.width,
          height: squareCameraConfig.bounds.height,
        },
        scene: [BootScene, SquareScene],
      });

      game.registry.set(MEMBER_REGISTRY_KEY, fetchState.member);
      game.registry.set(COLYSEUS_CONNECTION_REGISTRY_KEY, connection);
      if (spawnOverride) {
        game.registry.set(SQUARE_SPAWN_OVERRIDE_REGISTRY_KEY, spawnOverride);
      }
      game.registry.set(NEXT_SCENE_KEY_REGISTRY_KEY, SQUARE_SCENE_KEY);
      game.registry.set(PROGRESS_CALLBACK_REGISTRY_KEY, (progress: number) => {
        setPreloadProgress(progress);
      });
      setPreloadProgress(0);
      gameRef.current = game;
    })();

    return () => {
      cancelled = true;
      const game = gameRef.current;
      gameRef.current = null;
      if (game) game.destroy(true);
      const conn = connectionRef.current;
      connectionRef.current = null;
      setColyseusConn(null);
      if (conn) void conn.leave();
    };
  }, [fetchState]);

  if (fetchState.status === 'error' || connectError) {
    const message = fetchState.status === 'error' ? fetchState.message : connectError!;
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300">
        <p className="text-lg">Couldn&rsquo;t load the world.</p>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    );
  }

  const sceneReady =
    fetchState.status === 'ready' && preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b1220]">
      {fetchState.status === 'ready' && (
        <PlayerHud
          memberId={fetchState.member.memberId}
          displayName={fetchState.member.displayName}
          initialXp={fetchState.member.xp}
          loaded={sceneReady}
        />
      )}
      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        <BuildingTransition
          ready={sceneReady}
          displayName="The Square"
          backgroundImage="/worlds/square-2508x2508.png"
        />
        <LevelUpBanner />
        <SageFeatures
          gameRef={gameRef as unknown as React.MutableRefObject<PhaserGameLike | null>}
        />
      </div>
    </div>
  );
}
