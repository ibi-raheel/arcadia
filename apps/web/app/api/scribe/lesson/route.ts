// Route handler: POST /api/scribe/lesson
//
// Streams a single lesson body as markdown. Writes the body to
// `course_drafts.lessons` jsonb on stream close (approved=false so
// the user still has to approve each lesson card explicitly).
//
// Body: { draftId, sectionId, lessonId, feedback? }

import { streamText } from 'ai';

import { scribeConfigured, scribeLanguageModel, tokenBudget } from '@/lib/scribe/gateway';
import { readScribePreferences } from '@/lib/scribe/preferences';
import { lessonPrompt } from '@/lib/scribe/prompts';
import type { DraftLessonBody, DraftOutlineSection, DraftSource } from '@/lib/types/course-drafts';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = {
  readonly draftId?: string;
  readonly sectionId?: string;
  readonly lessonId?: string;
  readonly feedback?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (!scribeConfigured()) return err('the scribe is not configured on this deploy', 503);

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.draftId || !body.sectionId || !body.lessonId) {
    return err('draftId, sectionId, lessonId are required', 400);
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err('not signed in', 401);

  const { data: draftRow, error: readErr } = await supabase
    .from('course_drafts')
    .select('id, creator_id, title, user_prompt, sources, outline, lessons, tokens_used')
    .eq('id', body.draftId)
    .eq('creator_id', user.id)
    .maybeSingle();
  if (readErr) return err(readErr.message, 500);
  if (!draftRow) return err('draft not found', 404);

  if ((draftRow.tokens_used as number) >= tokenBudget()) {
    return err('token budget reached for this draft', 429);
  }

  const outline = (draftRow.outline as DraftOutlineSection[]) ?? [];
  const section = outline.find((s) => s.id === body.sectionId);
  if (!section) return err('section not found in outline', 404);
  const lesson = section.lessons.find((l) => l.id === body.lessonId);
  if (!lesson) return err('lesson not found in section', 404);

  const peers = section.lessons.filter((l) => l.id !== lesson.id).map((l) => l.title);

  const preferences = await readScribePreferences(user.id);
  const { system, prompt } = lessonPrompt({
    courseTitle: (draftRow.title as string | null) ?? 'Untitled course',
    sectionTitle: section.title,
    lessonTitle: lesson.title,
    peerLessonTitles: peers,
    userPrompt: (draftRow.user_prompt as string | null) ?? '',
    sources: (draftRow.sources as DraftSource[]) ?? [],
    preferences,
    revisionFeedback: body.feedback,
  });

  const result = streamText({
    model: scribeLanguageModel('lesson'),
    system,
    prompt,
    temperature: 0.6,
  });

  const encoder = new TextEncoder();
  let accumulated = '';

  const sectionId = body.sectionId;
  const lessonId = body.lessonId;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          accumulated += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();

        const usage = await result.usage;
        const newTokens =
          (draftRow.tokens_used as number) + ((usage.inputTokens ?? 0) + (usage.outputTokens ?? 0));

        const currentLessons = ((draftRow.lessons as DraftLessonBody[]) ?? []).filter(
          (l) => !(l.section_id === sectionId && l.lesson_id === lessonId),
        );
        const nextLessons: DraftLessonBody[] = [
          ...currentLessons,
          {
            section_id: sectionId,
            lesson_id: lessonId,
            body_markdown: accumulated,
            approved: false,
          },
        ];

        await supabase
          .from('course_drafts')
          .update({ lessons: nextLessons, tokens_used: newTokens })
          .eq('id', body.draftId!)
          .eq('creator_id', user.id);
      } catch (streamErr) {
        controller.error(streamErr);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

function err(message: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
