import { parseSetup } from '../../lib/setup.ts';
import { bad, readJson, upstreamError } from '../../server/http.ts';
import {
  openai,
  REALTIME_MODEL,
  SECRET_TTL_SECONDS,
  SESSION_SECONDS,
  TRANSCRIBE_MODEL,
  VOICE,
} from '../../server/openai.ts';
import { voiceInstructions } from '../../server/prompts.ts';
import { check, tooMany } from '../../server/ratelimit.ts';

export async function POST(req: Request) {
  const read = await readJson(req, 16_000);
  if (!read.ok) return read.res;
  const parsed = parseSetup((read.body as { setup?: unknown })?.setup);
  if (!parsed.ok) return bad(parsed.error);

  const gate = check(req, 'session');
  if (!gate.ok) return tooMany(gate.retryAfter, 'three interview sessions');

  try {
    const secret = await openai().realtime.clientSecrets.create({
      // Short TTL: the secret only has to survive the WebRTC handshake.
      expires_after: { anchor: 'created_at', seconds: SECRET_TTL_SECONDS },
      session: {
        type: 'realtime',
        model: REALTIME_MODEL,
        instructions: voiceInstructions(parsed.setup, Math.round(SESSION_SECONDS / 60)),
        output_modalities: ['audio'],
        max_output_tokens: 400,
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

    return Response.json(
      {
        clientSecret: secret.value,
        expiresAt: secret.expires_at,
        model: REALTIME_MODEL,
        capSeconds: SESSION_SECONDS,
        remaining: gate.remaining,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    return upstreamError(err);
  }
}
