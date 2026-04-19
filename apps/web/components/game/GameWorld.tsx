// React mount for the Phaser canvas. Fetches the authed member's
// memberships row (avatar_id + display_name) + Supabase access token, then
// opens the `world-realm1` Colyseus room before instantiating Phaser so
// WorldScene can read both from the registry in create(). See scenes/world/
// WorldScene.ts — the `member` and `colyseus` registry keys are the handshake.
//
// Must be `next/dynamic`-imported with `{ ssr: false }` (see app/world/page.tsx)
// — Phaser reaches for `window` + WebGL at import time.

'use client';

import * as Phaser from 'phaser';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { connectToRoom, type ColyseusConnection } from './net/colyseus-client';
import { BootScene } from './scenes/boot/BootScene';
import { PROGRESS_CALLBACK_REGISTRY_KEY } from './scenes/boot/asset-manifest';
import { isAvatarId, type AvatarId } from './scenes/shared/avatar-palette';
import { isBuildingName } from './scenes/shared/types';
import { worldCameraConfig } from './scenes/world/camera.config';
import {
  COLYSEUS_CONNECTION_REGISTRY_KEY,
  MEMBER_REGISTRY_KEY,
  NAVIGATE_REGISTRY_KEY,
  SPAWN_FROM_REGISTRY_KEY,
  type NavigateFn,
  type SceneMember,
  WorldScene,
} from './scenes/world/WorldScene';
import { WorldLoadingScreen } from './WorldLoadingScreen';

const REALM_NAME = 'mvp-realm';
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
    return {
      status: 'error',
      message: sessionError?.message ?? 'Not signed in.',
    };
  }
  const user = session.user;

  const { data, error } = await supabase
    .from('memberships')
    .select('avatar_id, display_name')
    .eq('member_id', user.id)
    .maybeSingle();

  if (error) {
    return { status: 'error', message: error.message };
  }
  if (!data?.avatar_id) {
    // Middleware gate should catch this before we ever render GameWorld,
    // but if we somehow land here, surface it rather than silently break.
    return { status: 'error', message: 'No avatar selected.' };
  }
  if (!isAvatarId(data.avatar_id)) {
    return {
      status: 'error',
      message: `Invalid avatar_id "${data.avatar_id}".`,
    };
  }

  const avatarId: AvatarId = data.avatar_id;
  const displayName = data.display_name ?? 'Player';
  return {
    status: 'ready',
    member: { avatarId, displayName },
    accessToken: session.access_token,
  };
}

export default function GameWorld(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams?.get('from') ?? null;
  const spawnFrom = fromParam && isBuildingName(fromParam) ? fromParam : null;

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const connectionRef = useRef<ColyseusConnection | null>(null);
  const [fetchState, setFetchState] = useState<SessionFetch>({
    status: 'loading',
  });
  const [connectError, setConnectError] = useState<string | null>(null);
  // null = Phaser hasn't started preloading yet; 0..1 from BootScene's
  // LoaderPlugin events; hidden once === 1.
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((result) => {
      if (!cancelled) setFetchState(result);
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

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        backgroundColor: '#1f2937',
        pixelArt: true,
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          width: worldCameraConfig.bounds.width,
          height: worldCameraConfig.bounds.height,
        },
        scene: [BootScene, WorldScene],
      });

      const navigate: NavigateFn = (path) => router.push(path);
      game.registry.set(MEMBER_REGISTRY_KEY, fetchState.member);
      game.registry.set(NAVIGATE_REGISTRY_KEY, navigate);
      game.registry.set(COLYSEUS_CONNECTION_REGISTRY_KEY, connection);
      game.registry.set(PROGRESS_CALLBACK_REGISTRY_KEY, (progress: number) => {
        setPreloadProgress(progress);
      });
      if (spawnFrom) {
        game.registry.set(SPAWN_FROM_REGISTRY_KEY, spawnFrom);
      }
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
      if (conn) void conn.leave();
    };
  }, [fetchState, router, spawnFrom]);

  if (fetchState.status === 'error' || connectError) {
    const message =
      fetchState.status === 'error' ? fetchState.message : (connectError ?? 'Connection error.');
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300">
        <p className="text-lg">Couldn&rsquo;t load the world.</p>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    );
  }

  const showLoadingOverlay =
    fetchState.status === 'loading' || preloadProgress === null || preloadProgress < 1;

  return (
    <div className="relative h-screen w-screen">
      <div ref={containerRef} className="absolute inset-0" />
      {showLoadingOverlay && (
        <WorldLoadingScreen
          realmName={REALM_NAME}
          progress={fetchState.status === 'loading' ? null : preloadProgress}
        />
      )}
    </div>
  );
}
