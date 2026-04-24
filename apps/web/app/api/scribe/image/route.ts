// Route handler: POST /api/scribe/image
//
// Generates a single image via Imagen 4 Fast (Google's dedicated
// image endpoint on the Generative Language API), uploads it to the
// `course-generated-images` bucket, and appends an entry to
// `course_drafts.images` jsonb (approved=false).
//
// Body: {
//   draftId: string,
//   target: 'thumbnail' | { lessonId: string, sectionId: string },
//   feedback?: string
// }

import { randomUUID } from 'crypto';

import { experimental_generateImage as generateImage } from 'ai';

import { scribeConfigured, scribeImageModel } from '@/lib/scribe/gateway';
import { imagePrompt } from '@/lib/scribe/prompts';
import type {
  DraftImage,
  DraftImageTarget,
  DraftLessonBody,
  DraftOutlineSection,
} from '@/lib/types/course-drafts';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = {
  readonly draftId?: string;
  readonly target?: 'thumbnail' | { readonly sectionId: string; readonly lessonId: string };
  readonly feedback?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (!scribeConfigured()) return err('the scribe is not configured on this deploy', 503);

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.draftId || !body.target) return err('draftId and target are required', 400);

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err('not signed in', 401);

  const { data: draftRow, error: readErr } = await supabase
    .from('course_drafts')
    .select('id, creator_id, title, outline, lessons, images')
    .eq('id', body.draftId)
    .eq('creator_id', user.id)
    .maybeSingle();
  if (readErr) return err(readErr.message, 500);
  if (!draftRow) return err('draft not found', 404);

  const courseTitle = (draftRow.title as string | null) ?? 'Untitled course';
  const outline = (draftRow.outline as DraftOutlineSection[]) ?? [];
  const lessonBodies = (draftRow.lessons as DraftLessonBody[]) ?? [];

  let subjectTitle: string;
  let subjectSummary: string;
  let targetStore: DraftImageTarget;

  const targetInput = body.target;
  if (targetInput === 'thumbnail') {
    subjectTitle = courseTitle;
    subjectSummary = summariseCourse(outline, lessonBodies);
    targetStore = 'thumbnail';
  } else {
    const section = outline.find((s) => s.id === targetInput.sectionId);
    const lesson = section?.lessons.find((l) => l.id === targetInput.lessonId);
    if (!section || !lesson) return err('section or lesson not found', 404);

    const lessonBody = lessonBodies.find(
      (l) => l.section_id === section.id && l.lesson_id === lesson.id,
    );
    subjectTitle = lesson.title;
    subjectSummary = summariseLesson(section.title, lesson.title, lessonBody?.body_markdown);
    targetStore = { lesson_id: lesson.id };
  }

  const prompt = imagePrompt({
    target: body.target === 'thumbnail' ? 'thumbnail' : 'lesson',
    courseTitle,
    subjectTitle,
    subjectSummary,
    revisionFeedback: body.feedback,
  });

  let generated;
  try {
    generated = await generateImage({
      model: scribeImageModel(),
      prompt,
      size: '1024x768',
    });
  } catch (generationErr) {
    return err(
      `image generation failed: ${
        generationErr instanceof Error ? generationErr.message : String(generationErr)
      }`,
      502,
    );
  }

  const mimeType = generated.image.mediaType ?? 'image/png';
  const ext = mimeType.split('/')[1] ?? 'png';
  const bytes = generated.image.uint8Array;

  const imageId = randomUUID();
  const storagePath = `${user.id}/${body.draftId}/${imageId}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('course-generated-images')
    .upload(storagePath, Buffer.from(bytes), { contentType: mimeType, upsert: false });
  if (uploadErr) return err(`upload failed: ${uploadErr.message}`, 500);

  const {
    data: { publicUrl },
  } = supabase.storage.from('course-generated-images').getPublicUrl(storagePath);

  const currentImages = ((draftRow.images as DraftImage[]) ?? []).filter(
    (img) => !sameTarget(img.target, targetStore),
  );
  const nextImage: DraftImage = {
    id: imageId,
    target: targetStore,
    url: publicUrl,
    prompt,
    approved: false,
  };
  const nextImages = [...currentImages, nextImage];

  const { error: patchErr } = await supabase
    .from('course_drafts')
    .update({ images: nextImages })
    .eq('id', body.draftId)
    .eq('creator_id', user.id);
  if (patchErr) return err(patchErr.message, 500);

  return new Response(JSON.stringify({ ok: true, value: { image: nextImage } }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function sameTarget(a: DraftImageTarget, b: DraftImageTarget): boolean {
  if (a === 'thumbnail' || b === 'thumbnail') return a === b;
  return a.lesson_id === b.lesson_id;
}

function summariseCourse(
  outline: readonly DraftOutlineSection[],
  lessons: readonly DraftLessonBody[],
): string {
  const sections = outline.map((s) => s.title).join(' · ');
  const firstLesson = lessons[0];
  const hint = firstLesson
    ? firstLesson.body_markdown.trim().slice(0, 160).replace(/\n+/g, ' ')
    : '';
  return `${sections}. ${hint}`.trim();
}

function summariseLesson(
  sectionTitle: string,
  lessonTitle: string,
  body: string | undefined,
): string {
  const hint = body ? body.trim().slice(0, 200).replace(/\n+/g, ' ') : '';
  return `${sectionTitle} — ${lessonTitle}. ${hint}`.trim();
}

function err(message: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
