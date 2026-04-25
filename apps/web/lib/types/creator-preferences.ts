// Row shape for the `creator_preferences` table (migration
// 20260425000003_phase10_creator_preferences.sql). Per-creator
// preferences the scribe reads on every stage.

export type CreatorPreferences = {
  readonly creator_id: string;
  readonly voice_guide: string | null;
  readonly image_style: string | null;
  readonly audience: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

/** The fields a creator can edit; creator_id + timestamps are
 *  managed by the DB. */
export type CreatorPreferencesInput = {
  readonly voice_guide?: string | null;
  readonly image_style?: string | null;
  readonly audience?: string | null;
};

export const VOICE_GUIDE_MAX = 1_500;
export const IMAGE_STYLE_MAX = 500;
export const AUDIENCE_MAX = 500;
