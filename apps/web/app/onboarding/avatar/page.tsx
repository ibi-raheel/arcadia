// /onboarding/avatar — first-login avatar picker (Phase 1 Step 10, TAD §3.3).
// 4×2 grid of 8 Rectangle-color swatches (Phase 1 placeholders; real sprite
// thumbnails swap in with real art). Clicking a swatch upserts the user's
// `memberships.avatar_id` and redirects to /world.
//
// RLS policy lets a member update their own memberships row (TAD §6.2), so
// the write runs browser-side with the user's session — no server action /
// API route needed.

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  AVATAR_COLORS,
  AVATAR_IDS,
  type AvatarId,
} from '@/components/game/scenes/shared/avatar-palette';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function toCssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function AvatarPickerForm() {
  const router = useRouter();
  const [selected, setSelected] = useState<AvatarId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selected || submitting) return;

    setSubmitting(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(userError?.message ?? 'Not signed in.');
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('memberships')
      .update({ avatar_id: selected })
      .eq('member_id', userData.user.id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push('/world');
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div role="radiogroup" aria-label="Avatar selection" className="grid grid-cols-4 gap-4">
        {AVATAR_IDS.map((id) => {
          const isSelected = selected === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(id)}
              className={`flex aspect-[2/3] flex-col items-center justify-end gap-1 rounded-lg border-2 p-2 transition ${
                isSelected ? 'border-white' : 'border-neutral-800 hover:border-neutral-600'
              }`}
              style={{ backgroundColor: toCssHex(AVATAR_COLORS[id]) }}
            >
              <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {id}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selected || submitting}
        className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-60"
      >
        {submitting ? 'Saving…' : 'Enter Arcadia'}
      </button>
    </div>
  );
}

export default function OnboardingAvatarPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0a] p-8 text-neutral-200">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Choose your avatar</h1>
        <p className="max-w-sm text-sm text-neutral-400">
          Pick a colour for your placeholder avatar. You can&rsquo;t change this later in Phase 1 —
          real sprite selection lands when the art ships.
        </p>
      </div>
      <AvatarPickerForm />
    </main>
  );
}
