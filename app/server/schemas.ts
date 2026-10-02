import { z } from 'zod';

const Dim = z.object({
  score: z.number().int(),
  evidence: z.array(z.string()),
  rationale: z.string(),
});

export const ReportSchema = z.object({
  headline: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      answered: z.boolean(),
      answer_summary: z.string(),
      star: Dim,
      clarity: Dim,
      depth: Dim,
      improvement: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  practice_questions: z.array(z.string()),
});

export const NextTurnSchema = z.object({
  message: z.string(),
  closing: z.boolean(),
});

const TurnIn = z.object({
  speaker: z.enum(['interviewer', 'candidate']),
  text: z.string().max(4000),
});

export const TranscriptIn = z.array(TurnIn).max(120);
