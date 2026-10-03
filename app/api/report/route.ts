import { zodTextFormat } from 'openai/helpers/zod';
import { scoreReport } from '../../lib/report.ts';
import { parseSetup } from '../../lib/setup.ts';
import { shapeTranscript, toPromptText } from '../../lib/transcript.ts';
import { bad, readJson, upstreamError } from '../../server/http.ts';
import { openai, TEXT_MODEL } from '../../server/openai.ts';
import { REPORT_INSTRUCTIONS } from '../../server/prompts.ts';
import { check, tooMany } from '../../server/ratelimit.ts';
import { ReportSchema, TranscriptIn } from '../../server/schemas.ts';

export const maxDuration = 90;

const MIN_CANDIDATE_WORDS = 15;

export async function POST(req: Request) {
  const read = await readJson(req, 120_000);
  if (!read.ok) return read.res;
  const body = read.body as { setup?: unknown; transcript?: unknown };

  const parsed = parseSetup(body?.setup);
  if (!parsed.ok) return bad(parsed.error);
  const transcript = TranscriptIn.safeParse(body?.transcript);
  if (!transcript.success) return bad('Transcript must be a list of { speaker, text } turns.');

  const shaped = shapeTranscript(transcript.data);
  if (shaped.candidateWords < MIN_CANDIDATE_WORDS) {
    return bad('Not enough answers to score yet. Answer at least one question first.');
  }

  const gate = await check(req, 'report');
  if (!gate.ok) return tooMany(gate, 'five reports');

  const { setup } = parsed;
  try {
    const started = Date.now();
    const res = await openai().responses.parse({
      model: TEXT_MODEL,
      instructions: REPORT_INSTRUCTIONS,
      input: `Role: ${setup.roleTitle} (${setup.level}, ${setup.type})

<job_description>
${setup.jobDescription}
</job_description>

<transcript>
${toPromptText(shaped.turns)}
</transcript>`,
      text: { format: zodTextFormat(ReportSchema, 'interview_report') },
      reasoning: { effort: 'low' },
      max_output_tokens: 8000,
    });

    if (!res.output_parsed) return bad('The model did not return a report. Try again.', 502);
    const report = scoreReport(res.output_parsed, shaped.turns);

    return Response.json({
      report,
      meta: {
        model: TEXT_MODEL,
        ms: Date.now() - started,
        inputTokens: res.usage?.input_tokens ?? null,
        outputTokens: res.usage?.output_tokens ?? null,
        truncated: shaped.truncated,
        turns: shaped.turns.length,
      },
    });
  } catch (err) {
    return upstreamError(err);
  }
}
