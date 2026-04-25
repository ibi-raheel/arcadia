// Server-only helper for reading a creator's scribe preferences from
// route handlers (not server actions). Route handlers can't call
// server actions via import — they'd get a "use server" boundary
// violation — so this bypass lives in /lib where plain functions
// are fine.

import { getSupabaseServerClient } from '@/lib/supabase/server';

export type ScribePreferences = {
  readonly voice_guide: string | null;
  readonly image_style: string | null;
  readonly audience: string | null;
};

export const EMPTY_PREFERENCES: ScribePreferences = {
  voice_guide: null,
  image_style: null,
  audience: null,
};

/** Fetch the signed-in creator's preferences. Falls back to empty
 *  if nothing's set or the row doesn't exist. Never throws. */
export async function readScribePreferences(userId: string): Promise<ScribePreferences> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('creator_preferences')
    .select('voice_guide, image_style, audience')
    .eq('creator_id', userId)
    .maybeSingle();
  if (!data) return EMPTY_PREFERENCES;
  return {
    voice_guide: (data.voice_guide as string | null) ?? null,
    image_style: (data.image_style as string | null) ?? null,
    audience: (data.audience as string | null) ?? null,
  };
}
