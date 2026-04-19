// React mount for the Phaser canvas. Fetches the authed member's
// memberships row (avatar_id + display_name) before instantiating Phaser
// so WorldScene can read from the registry in create(). See scenes/world/
// WorldScene.ts — the `member` registry key is the handshake.
//
// Must be `next/dynamic`-imported with `{ ssr: false }` (see app/world/page.tsx)
// — Phaser reaches for `window` + WebGL at import time.

'use client';

import * as Phaser from 'phaser';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { BootScene } from './scenes/boot/BootScene';
import { PROGRESS_CALLBACK_REGISTRY_KEY } from './scenes/boot/asset-manifest';
import { isAvatarId, type AvatarId } from './scenes/shared/avatar-palette';
import { isBuildingName } from './scenes/shared/types';
import { worldCameraConfig } from './scenes/world/camera.config';
import {
  MEMBER_REGISTRY_KEY,
  NAVIGATE_REGISTRY_KEY,
  SPAWN_FROM_REGISTRY_KEY,
  type NavigateFn,
  type SceneMember,
  WorldScene,
} from './scenes/world/WorldScene';
import { WorldLoadingScreen } from './WorldLoadingScreen';

const REALM_NAME = 'mvp-realm';

type MemberFetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; member: SceneMember };

async function fetchMember(): Promise<MemberFetchState> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      status: 'error',
      message: userError?.message ?? 'Not signed in.',
    };
  }

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
  return { status: 'ready', member: { avatarId, displayName } };
}

export default function GameWorld(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams?.get('from') ?? null;
  const spawnFrom = fromParam && isBuildingName(fromParam) ? fromParam : null;

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [fetchState, setFetchState] = useState<MemberFetchState>({
    status: 'loading',
  });
  // null = Phaser hasn't started preloading yet; 0..1 from BootScene's
  // LoaderPlugin events; hidden once === 1.
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMember().then((result) => {
      if (!cancelled) setFetchState(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fetchState.status !== 'ready' || !containerRef.current || gameRef.current) {
      return;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#1f2937', // slate-800 — visible before preload completes
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
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
    game.registry.set(PROGRESS_CALLBACK_REGISTRY_KEY, (progress: number) => {
      setPreloadProgress(progress);
    });
    if (spawnFrom) {
      game.registry.set(SPAWN_FROM_REGISTRY_KEY, spawnFrom);
    }
    // Enter pre-preload indeterminate state — BootScene flips this to 0..1
    // as assets load, then 1 on complete which hides the overlay.
    setPreloadProgress(0);
    gameRef.current = game;

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [fetchState]);

  if (fetchState.status === 'error') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300">
        <p className="text-lg">Couldn&rsquo;t load the world.</p>
        <p className="text-sm text-slate-500">{fetchState.message}</p>
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
