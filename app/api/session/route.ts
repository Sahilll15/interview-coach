import { after } from 'next/server';
import { parseSetup } from '../../lib/setup.ts';
import { callIdFrom, hangup, hangupAt, sweepOverdue } from '../../server/calls.ts';
import { bad, readJson, upstreamError } from '../../server/http.ts';
import {
  HANGUP_GRACE_SECONDS,
  openai,
  REALTIME_MODEL,
  SESSION_SECONDS,
  TRANSCRIBE_MODEL,
  VOICE,
} from '../../server/openai.ts';
import { voiceInstructions } from '../../server/prompts.ts';
import { budgetSpent, check, sessionBudget, tooMany } from '../../server/ratelimit.ts';

// The function stays alive after responding so it can hang the call up. 300s is the Vercel Hobby limit.
export const maxDuration = 300;

const MAX_SDP = 20_000;

export async function POST(req: Request) {
  const read = await readJson(req, 32_000);
  if (!read.ok) return read.res;
  const body = read.body as { setup?: unknown; sdp?: unknown };
  const parsed = parseSetup(body?.setup);
  if (!parsed.ok) return bad(parsed.error);
  const sdp = body?.sdp;
  if (typeof sdp !== 'string' || !sdp.startsWith('v=0') || sdp.length > MAX_SDP) {
    return bad('Missing or invalid WebRTC offer.');
  }

  const gate = await check(req, 'session');
  if (!gate.ok) return tooMany(gate, 'three interview sessions');
  const spend = await sessionBudget.take();
  if (!spend.ok) return budgetSpent(spend);
  sweepOverdue();

  try {
    // The server opens the call with its own key, so the browser never holds a reusable credential.
    const res = await openai().realtime.calls.create({
      sdp,
      session: {
        type: 'realtime',
        model: REALTIME_MODEL,
        instructions: voiceInstructions(parsed.setup, Math.round(SESSION_SECONDS / 60)),
        output_modalities: ['audio'],
        max_output_tokens: 400,
        tracing: null,
        truncation: { type: 'retention_ratio', retention_ratio: 0.7, token_limits: { post_instructions: 12_000 } },
        audio: {
          input: {
            transcription: { model: TRANSCRIBE_MODEL, language: 'en' },
            noise_reduction: { type: 'near_field' },
            turn_detection: { type: 'semantic_vad', eagerness: 'low', interrupt_response: true },
          },
          output: { voice: VOICE },
        },
      },
    });
    const answer = await res.text();
    const callId = callIdFrom(res.headers.get('location'));
    if (!callId) {
      console.error('realtime call created without a call id');
      return bad('The voice service did not return a call id. Try again.', 502);
    }
    if (!answer.startsWith('v=0')) {
      after(() => hangup(callId));
      return bad('The voice service returned an unexpected answer. Try again.', 502);
    }

    const deadline = Date.now() + (SESSION_SECONDS + HANGUP_GRACE_SECONDS) * 1000;
    after(() => hangupAt(callId, deadline));

    return Response.json(
      { sdp: answer, model: REALTIME_MODEL, capSeconds: SESSION_SECONDS, remaining: gate.remaining },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    return upstreamError(err);
  }
}
