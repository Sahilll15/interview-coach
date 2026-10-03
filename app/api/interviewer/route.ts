import { zodTextFormat } from 'openai/helpers/zod';
import { parseSetup } from '../../lib/setup.ts';
import { shapeTranscript, toPromptText } from '../../lib/transcript.ts';
import { bad, readJson, upstreamError } from '../../server/http.ts';
import { openai, TEXT_MAX_ANSWERS, TEXT_MODEL } from '../../server/openai.ts';
import { textInstructions } from '../../server/prompts.ts';
import { budgetSpent, check, sessionBudget, tooMany } from '../../server/ratelimit.ts';
import { NextTurnSchema, TranscriptIn } from '../../server/schemas.ts';

export const maxDuration = 30;

export async function POST(req: Request) {
  const read = await readJson(req, 80_000);
  if (!read.ok) return read.res;
  const body = read.body as { setup?: unknown; transcript?: unknown };

  const parsed = parseSetup(body?.setup);
  if (!parsed.ok) return bad(parsed.error);
  const transcript = TranscriptIn.safeParse(body?.transcript ?? []);
  if (!transcript.success) return bad('Transcript must be a list of { speaker, text } turns.');

  const shaped = shapeTranscript(transcript.data);
  const answers = shaped.turns.filter((t) => t.speaker === 'candidate').length;
  if (shaped.turns.length && shaped.turns[shaped.turns.length - 1].speaker !== 'candidate') {
    return bad('Waiting for the candidate to answer.');
  }
  if (answers > TEXT_MAX_ANSWERS) return bad('This interview is over. Generate your report.');

  // A fresh text interview counts as a session, same budget as voice.
  const gate = await check(req, answers === 0 ? 'session' : 'turn');
  if (!gate.ok) return tooMany(gate, answers === 0 ? 'three interview sessions' : 'forty answers');
  if (answers === 0) {
    const spend = await sessionBudget.take();
    if (!spend.ok) return budgetSpent(spend);
  }

  const isLast = answers >= TEXT_MAX_ANSWERS;
  try {
    const res = await openai().responses.parse({
      model: TEXT_MODEL,
      instructions: textInstructions(parsed.setup, TEXT_MAX_ANSWERS),
      input: shaped.turns.length
        ? `<transcript>\n${toPromptText(shaped.turns)}\n</transcript>\n\n${
            isLast ? 'The interview is over. Close it now.' : `Candidate answers so far: ${answers} of ${TEXT_MAX_ANSWERS}.`
          }`
        : 'The interview is starting. Greet the candidate in one sentence and ask your first question.',
      text: { format: zodTextFormat(NextTurnSchema, 'next_turn') },
      reasoning: { effort: 'low' },
      max_output_tokens: 1500,
    });

    const out = res.output_parsed;
    if (!out?.message.trim()) return bad('The interviewer did not reply. Try again.', 502);
    return Response.json({ message: out.message.trim(), closing: isLast || out.closing, answers, maxAnswers: TEXT_MAX_ANSWERS });
  } catch (err) {
    return upstreamError(err);
  }
}
