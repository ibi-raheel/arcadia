// Mirrors GameTavern but for a tent interior. Reads `?b=<building>` from the
// URL, passes it as both the Colyseus join option (so `filterBy(['building'])`
// routes to the right room) and the scene-registry building ID (so the HUD
// labels correctly).

'use client';

import * as Phaser from 'phaser';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { MSG } from '@arcadia/shared';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { BuildingTransition } from './BuildingTransition';
import { LevelUpBanner } from './LevelUpBanner';
import { useLevelSync } from './net/use-level-sync';
import { connectToRoom, type ColyseusConnection } from './net/colyseus-client';
import { BootScene } from './scenes/boot/BootScene';
import {
  NEXT_SCENE_KEY_REGISTRY_KEY,
  PROGRESS_CALLBACK_REGISTRY_KEY,
} from './scenes/boot/asset-manifest';
import { coworkingInsideCameraConfig } from './scenes/coworking-inside/camera.config';
import {
  COWORKING_BUILDING_ID_REGISTRY_KEY,
  CoworkingInsideScene,
  COWORKING_INSIDE_SCENE_KEY,
} from './scenes/coworking-inside/CoworkingInsideScene';
import { isAvatarId, type AvatarId } from './scenes/shared/avatar-palette';
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
    .select('avatar_id, display_name, realm_id')
    .eq('member_id', session.user.id)
    .maybeSingle();
  if (error) return { status: 'error', message: error.message };
  if (!data?.avatar_id) return { status: 'error', message: 'No avatar selected.' };
  if (!isAvatarId(data.avatar_id)) {
    return { status: 'error', message: `Invalid avatar_id "${data.avatar_id}".` };
  }
  if (!data.realm_id) return { status: 'error', message: 'No realm for member.' };
  const avatarId: AvatarId = data.avatar_id;
  return {
    status: 'ready',
    member: {
      memberId: session.user.id,
      realmId: data.realm_id,
      avatarId,
      displayName: data.display_name ?? 'Player',
    },
    accessToken: session.access_token,
  };
}

export default function GameCoworkingInside(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buildingId = useMemo(() => searchParams.get('b') ?? '', [searchParams]);

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const connectionRef = useRef<ColyseusConnection | null>(null);
  const [fetchState, setFetchState] = useState<SessionFetch>({ status: 'loading' });
  const [connectError, setConnectError] = useState<string | null>(null);
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);
  const [colyseusConn, setColyseusConn] = useState<ColyseusConnection | null>(null);

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
      !COLYSEUS_ENDPOINT ||
      buildingId.length === 0
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
          roomName: 'coworking-realm1',
          accessToken: fetchState.accessToken,
          building: buildingId,
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
        backgroundColor: '#1f2937',
        pixelArt: true,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scale: {
          mode: Phaser.Scale.RESIZE,
          width: coworkingInsideCameraConfig.bounds.width,
          height: coworkingInsideCameraConfig.bounds.height,
        },
        scene: [BootScene, CoworkingInsideScene],
      });

      game.registry.set(MEMBER_REGISTRY_KEY, fetchState.member);
      game.registry.set(COLYSEUS_CONNECTION_REGISTRY_KEY, connection);
      game.registry.set(NEXT_SCENE_KEY_REGISTRY_KEY, COWORKING_INSIDE_SCENE_KEY);
      game.registry.set(COWORKING_BUILDING_ID_REGISTRY_KEY, buildingId);
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
  }, [fetchState, buildingId]);

  if (buildingId.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300">
        <p className="text-lg">No tent selected.</p>
        <p className="text-sm text-slate-500">Enter the coworking area from the camp.</p>
        <button
          type="button"
          className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900"
          onClick={() => router.push('/coworking')}
        >
          Go to the camp
        </button>
      </div>
    );
  }

  if (fetchState.status === 'error' || connectError) {
    const message = fetchState.status === 'error' ? fetchState.message : connectError!;
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300">
        <p className="text-lg">Couldn&rsquo;t enter the tent.</p>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    );
  }

  const sceneReady =
    fetchState.status === 'ready' && preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <BuildingTransition
        ready={sceneReady}
        displayName="Coworking Tent"
        backgroundImage="/worlds/coworkinginside-2508x2508.png"
      />
      <LevelUpBanner />
    </div>
  );
}
