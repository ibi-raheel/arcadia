// Route handler: POST /api/sage/chat
//
// Streams Gemini's response to the wanderer NPC's chat. Body is a
// conversation transcript (user / assistant alternating); response
// is a plain text/plain stream the client reads token-by-token.
//
// Knowledge is the static corpus from `lib/sage/knowledge.ts`,
// wrapped into the system message via `buildSageSystem`.

import { streamText } from 'ai';

import { scribeConfigured, scribeLanguageModel } from '@/lib/scribe/gateway';
import { getSageCorpus } from '@/lib/sage/knowledge';
import { buildSageSystem } from '@/lib/sage/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ChatMessage = {
  readonly role: 'user' | 'assistant';
  readonly content: string;
};

type Body = {
  readonly messages?: readonly ChatMessage[];
};

const MESSAGE_CHAR_CAP = 4_000;
const HISTORY_TURN_CAP = 30;

export async function POST(request: Request): Promise<Response> {
  if (!scribeConfigured()) return err('the sage is not configured on this deploy', 503);

  const body = (await request.json().catch(() => null)) as Body | null;
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return err('messages must be a non-empty array', 400);
  }

  // Validate roles + clip lengths so a chatty client can't blow the
  // context budget out from under us.
  const trimmed: ChatMessage[] = [];
  for (const m of messages.slice(-HISTORY_TURN_CAP)) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    if (typeof m.content !== 'string') continue;
    const content = m.content.slice(0, MESSAGE_CHAR_CAP);
    if (content.trim().length === 0) continue;
    trimmed.push({ role: m.role, content });
  }
  if (trimmed.length === 0) return err('no usable messages after trimming', 400);

  const corpus = await getSageCorpus();
  const system = buildSageSystem(corpus);

  // Reuse the lesson-stage model — Gemini Flash, fast + cheap, good
  // enough for conversational Q/A grounded in static doctrine.
  const result = streamText({
    model: scribeLanguageModel('lesson'),
    system,
    messages: trimmed,
    temperature: 0.4,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
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
