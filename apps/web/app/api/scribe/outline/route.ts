// Route handler: POST /api/scribe/outline
//
// Streams a JSON outline from Claude (via the AI Gateway) for the
// current draft. On stream close, parses the JSON, writes the
// outline + title to course_drafts, and advances the stage to
// `lessons`. The client reads the stream incrementally so the user
// sees the outline appear in real time.
//
// Body: { draftId: string; feedback?: string }
// Response: text/plain stream of JSON fragments. The final stream
//           output is a complete JSON object.

import { streamText } from 'ai';

import { scribeConfigured, scribeLanguageModel, tokenBudget } from '@/lib/scribe/gateway';
import { readScribePreferences } from '@/lib/scribe/preferences';
import { outlinePrompt, parseOutlineJson } from '@/lib/scribe/prompts';
import type { DraftSource } from '@/lib/types/course-drafts';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = {
  readonly draftId?: string;
  readonly feedback?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (!scribeConfigured()) {
    return jsonError('the scribe is not configured on this deploy', 503);
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.draftId) return jsonError('draftId is required', 400);

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('not signed in', 401);

  const { data: draftRow, error: readErr } = await supabase
    .from('course_drafts')
    .select('id, creator_id, user_prompt, sources, tokens_used, stage')
    .eq('id', body.draftId)
    .eq('creator_id', user.id)
    .maybeSingle();
  if (readErr) return jsonError(readErr.message, 500);
  if (!draftRow) return jsonError('draft not found', 404);

  if ((draftRow.tokens_used as number) >= tokenBudget()) {
    return jsonError('token budget reached for this draft', 429);
  }

  const preferences = await readScribePreferences(user.id);
  const { system, prompt } = outlinePrompt({
    userPrompt: (draftRow.user_prompt as string | null) ?? '',
    sources: (draftRow.sources as DraftSource[] | null) ?? [],
    preferences,
    revisionFeedback: body.feedback,
  });

  // streamText returns an object whose .textStream is an async
  // iterable of string chunks. We tap it for two things: (a) pipe to
  // the client, (b) accumulate for post-stream parse + save.
  const result = streamText({
    model: scribeLanguageModel('outline'),
    system,
    prompt,
    temperature: 0.5,
  });

  const encoder = new TextEncoder();
  let accumulated = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          accumulated += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();

        // Persist after the client has finished reading.
        try {
          const parsed = parseOutlineJson(accumulated);
          const usage = await result.usage;
          const newTokens =
            (draftRow.tokens_used as number) +
            ((usage.inputTokens ?? 0) + (usage.outputTokens ?? 0));

          await supabase
            .from('course_drafts')
            .update({
              outline: parsed.sections,
              title: parsed.title,
              stage: 'lessons',
              tokens_used: newTokens,
            })
            .eq('id', body.draftId!)
            .eq('creator_id', user.id);
        } catch {
          // Parse failed — leave the draft where it was so the user
          // can revise. The accumulated text still reached the
          // client; they see the scribbled outline and can retry.
        }
      } catch (err) {
        controller.error(err);
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

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
