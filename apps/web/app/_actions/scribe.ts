'use server';

// Server actions for the AI course maker ("the scribe").
//
// Phase 10 sub-phase layering:
//   10.2 · satchel       — getOrCreateDraft, uploadDraftSource,
//                           removeDraftSource, updateDraftPrompt
//   10.3 · streaming     — streamOutline, streamLesson, generateImage
//   10.7 · seal           — sealDraft (materialize into courses rows)
//
// Every action returns a discriminated Result so the client can
// surface errors without guessing.

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';

import type { CourseDraft, DraftSource, DraftStage } from '@/lib/types/course-drafts';
import { totalSourceChars } from '@/lib/types/course-drafts';
import { isSupportedMime, parseSourceBuffer } from '@/lib/scribe/parse';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB, mirrors migration
const MAX_FILES_PER_DRAFT = 5;
const MAX_TOTAL_CHARS_PER_DRAFT = 600_000; // ADR 0012
const USER_PROMPT_MAX = 2_000;

async function requireCreator(): Promise<
  Result<{ readonly userId: string; readonly realmId: string }>
> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('realm_id, role')
    .eq('member_id', user.id)
    .maybeSingle();
  if (!membership?.realm_id) return { ok: false, error: 'no realm membership' };
  if (membership.role !== 'creator' && membership.role !== 'admin') {
    return { ok: false, error: 'only creators can conjure courses' };
  }
  return { ok: true, value: { userId: user.id, realmId: membership.realm_id } };
}

function rowToDraft(row: Record<string, unknown>): CourseDraft {
  return {
    id: row.id as string,
    creator_id: row.creator_id as string,
    realm_id: row.realm_id as string,
    title: (row.title as string | null) ?? null,
    user_prompt: (row.user_prompt as string | null) ?? '',
    stage: (row.stage as DraftStage) ?? 'satchel',
    outline: (row.outline as CourseDraft['outline']) ?? [],
    sources: (row.sources as CourseDraft['sources']) ?? [],
    lessons: (row.lessons as CourseDraft['lessons']) ?? [],
    images: (row.images as CourseDraft['images']) ?? [],
    tokens_used: (row.tokens_used as number) ?? 0,
    sealed_course_id: (row.sealed_course_id as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * Returns the creator's current unsealed draft, or creates a fresh
 * one if none exists. Used by /dashboard/courses/conjure on page
 * load — lets the creator resume wherever they left off.
 */
export async function getOrCreateDraft(): Promise<Result<CourseDraft>> {
  const auth = await requireCreator();
  if (!auth.ok) return auth;

  const supabase = getSupabaseServerClient();

  const { data: existing, error: readErr } = await supabase
    .from('course_drafts')
    .select('*')
    .eq('creator_id', auth.value.userId)
    .neq('stage', 'sealed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (existing) return { ok: true, value: rowToDraft(existing) };

  const { data: fresh, error: insertErr } = await supabase
    .from('course_drafts')
    .insert({
      creator_id: auth.value.userId,
      realm_id: auth.value.realmId,
      user_prompt: '',
    })
    .select('*')
    .single();
  if (insertErr) return { ok: false, error: insertErr.message };
  return { ok: true, value: rowToDraft(fresh) };
}

export async function updateDraftPrompt(
  draftId: string,
  userPrompt: string,
): Promise<Result<{ readonly id: string }>> {
  const auth = await requireCreator();
  if (!auth.ok) return auth;

  const prompt = userPrompt.trim().slice(0, USER_PROMPT_MAX);
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('course_drafts')
    .update({ user_prompt: prompt })
    .eq('id', draftId)
    .eq('creator_id', auth.value.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/courses/conjure');
  return { ok: true, value: { id: draftId } };
}

/**
 * Uploads a single source file, parses it, and appends the result
 * to `course_drafts.sources` jsonb. Called once per file — the
 * client fires these sequentially per ADR 0012 to keep rate-limit
 * pressure down.
 *
 * FormData must carry one File under the key "file".
 */
export async function uploadDraftSource(
  draftId: string,
  formData: FormData,
): Promise<Result<{ readonly source: DraftSource }>> {
  const auth = await requireCreator();
  if (!auth.ok) return auth;

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'no file submitted' };
  if (file.size === 0) return { ok: false, error: 'file is empty' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'file over 10 MB' };
  if (!isSupportedMime(file.type)) return { ok: false, error: `unsupported type: ${file.type}` };

  const supabase = getSupabaseServerClient();
  const { data: draftRow, error: readErr } = await supabase
    .from('course_drafts')
    .select('id, sources, creator_id')
    .eq('id', draftId)
    .eq('creator_id', auth.value.userId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!draftRow) return { ok: false, error: 'draft not found' };

  const currentSources = (draftRow.sources ?? []) as DraftSource[];
  if (currentSources.length >= MAX_FILES_PER_DRAFT) {
    return { ok: false, error: `max ${MAX_FILES_PER_DRAFT} files per draft` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseSourceBuffer(buffer, file.type);

  const totalAfter = totalSourceChars(currentSources) + parsed.char_count;
  if (totalAfter > MAX_TOTAL_CHARS_PER_DRAFT) {
    return {
      ok: false,
      error: `adding this would exceed the ${MAX_TOTAL_CHARS_PER_DRAFT.toLocaleString()}-char budget`,
    };
  }

  const sourceId = randomUUID();
  const storagePath = `${auth.value.userId}/${draftId}/${sourceId}-${sanitise(file.name)}`;
  const { error: uploadErr } = await supabase.storage
    .from('course-draft-sources')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const source: DraftSource = {
    id: sourceId,
    filename: file.name,
    char_count: parsed.char_count,
    text: parsed.text,
    storage_path: storagePath,
  };
  const nextSources = [...currentSources, source];

  const { error: updateErr } = await supabase
    .from('course_drafts')
    .update({ sources: nextSources })
    .eq('id', draftId)
    .eq('creator_id', auth.value.userId);
  if (updateErr) {
    // Try to clean up the orphaned file so the bucket doesn't drift.
    await supabase.storage.from('course-draft-sources').remove([storagePath]);
    return { ok: false, error: updateErr.message };
  }
  revalidatePath('/dashboard/courses/conjure');
  return { ok: true, value: { source } };
}

export async function removeDraftSource(
  draftId: string,
  sourceId: string,
): Promise<Result<{ readonly id: string }>> {
  const auth = await requireCreator();
  if (!auth.ok) return auth;

  const supabase = getSupabaseServerClient();
  const { data: draftRow, error: readErr } = await supabase
    .from('course_drafts')
    .select('sources')
    .eq('id', draftId)
    .eq('creator_id', auth.value.userId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!draftRow) return { ok: false, error: 'draft not found' };

  const sources = (draftRow.sources ?? []) as DraftSource[];
  const target = sources.find((s) => s.id === sourceId);
  if (!target) return { ok: false, error: 'source not found' };

  const nextSources = sources.filter((s) => s.id !== sourceId);
  const { error: updateErr } = await supabase
    .from('course_drafts')
    .update({ sources: nextSources })
    .eq('id', draftId)
    .eq('creator_id', auth.value.userId);
  if (updateErr) return { ok: false, error: updateErr.message };

  // Storage orphan is tolerable if this fails — the row is source of truth.
  await supabase.storage.from('course-draft-sources').remove([target.storage_path]);
  revalidatePath('/dashboard/courses/conjure');
  return { ok: true, value: { id: sourceId } };
}

/** Keep filename readable in the Storage path but strip anything
 *  that could confuse the path parser. */
function sanitise(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}
