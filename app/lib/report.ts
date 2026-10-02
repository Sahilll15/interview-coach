import type { Setup } from './setup.ts';
import { LEVEL_LABEL, TYPE_LABEL } from './setup.ts';
import { candidateCorpus, normalizeForMatch, type ShapedTurn } from './transcript.ts';

export const DIMS = ['star', 'clarity', 'depth'] as const;
export type DimKey = (typeof DIMS)[number];

export const DIM_LABEL: Record<DimKey, string> = { star: 'STAR', clarity: 'Clarity', depth: 'Depth' };

export type RawDim = { score: number; evidence: string[]; rationale: string };
export type RawQuestion = {
  question: string;
  answered: boolean;
  answer_summary: string;
  star: RawDim;
  clarity: RawDim;
  depth: RawDim;
  improvement: string;
};
export type RawReport = {
  headline: string;
  questions: RawQuestion[];
  strengths: string[];
  gaps: string[];
  practice_questions: string[];
};

export type Quote = { text: string; verified: boolean };
export type Dim = { score: number; modelScore: number; capped: boolean; rationale: string; evidence: Quote[] };
export type ScoredQuestion = {
  question: string;
  answered: boolean;
  answerSummary: string;
  improvement: string;
  dims: Record<DimKey, Dim>;
  average: number | null;
};
export type Report = {
  headline: string;
  questions: ScoredQuestion[];
  overall: Record<DimKey, number | null>;
  overallScore: number | null;
  band: string;
  grounding: { quotes: number; verified: number; rate: number | null };
  strengths: string[];
  gaps: string[];
  practiceQuestions: string[];
};

// A score above this needs at least one quote we can find in the transcript.
export const UNGROUNDED_CAP = 3;
const MIN_QUOTE_WORDS = 3;

// Model prose is shown as is, so curly quotes and long dashes are normalized here.
export function plain(s: unknown) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s*\u2014\s*/g, ', ')
    .replace(/\u2013/g, '-')
    .trim();
}

export function unquote(s: string) {
  return s.replace(/^["'\s]+|["'\s]+$/g, '').trim();
}

export function clampScore(n: unknown) {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 1;
  return Math.min(5, Math.max(1, v));
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function verifyQuote(quote: string, corpus: string) {
  const q = normalizeForMatch(quote);
  if (q.split(' ').filter(Boolean).length < MIN_QUOTE_WORDS) return false;
  return corpus.includes(q);
}

export function bandFor(score: number | null) {
  if (score === null) return 'Not enough answers to score';
  if (score >= 4.3) return 'Strong hire signal';
  if (score >= 3.5) return 'Solid, with clear upside';
  if (score >= 2.5) return 'Mixed, needs sharper stories';
  return 'Early, keep practicing';
}

function list(xs: unknown, max: number) {
  if (!Array.isArray(xs)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    if (typeof x !== 'string') continue;
    const t = plain(x);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function scoreDim(raw: RawDim | undefined, corpus: string): Dim {
  const modelScore = clampScore(raw?.score);
  const evidence = list(raw?.evidence, 3)
    .map(unquote)
    .filter(Boolean)
    .map((text) => ({ text, verified: verifyQuote(text, corpus) }));
  const grounded = evidence.some((q) => q.verified);
  const capped = !grounded && modelScore > UNGROUNDED_CAP;
  return {
    score: capped ? UNGROUNDED_CAP : modelScore,
    modelScore,
    capped,
    rationale: plain(raw?.rationale),
    evidence,
  };
}

export function scoreReport(raw: RawReport, turns: ShapedTurn[]): Report {
  const corpus = candidateCorpus(turns);
  const questions: ScoredQuestion[] = (Array.isArray(raw.questions) ? raw.questions : [])
    .filter((q) => q && typeof q.question === 'string' && q.question.trim())
    .slice(0, 12)
    .map((q) => {
      const dims = {
        star: scoreDim(q.star, corpus),
        clarity: scoreDim(q.clarity, corpus),
        depth: scoreDim(q.depth, corpus),
      };
      const anyVerified = DIMS.some((d) => dims[d].evidence.some((e) => e.verified));
      const answered = Boolean(q.answered) && anyVerified;
      const avg = mean(DIMS.map((d) => dims[d].score));
      return {
        question: plain(q.question),
        answered,
        answerSummary: plain(q.answer_summary),
        improvement: plain(q.improvement),
        dims,
        average: answered && avg !== null ? round1(avg) : null,
      };
    });

  const answered = questions.filter((q) => q.answered);
  const overall = {} as Record<DimKey, number | null>;
  for (const d of DIMS) {
    const m = mean(answered.map((q) => q.dims[d].score));
    overall[d] = m === null ? null : round1(m);
  }
  const all = mean(answered.flatMap((q) => DIMS.map((d) => q.dims[d].score)));
  const overallScore = all === null ? null : round1(all);

  const quotes = questions.flatMap((q) => DIMS.flatMap((d) => q.dims[d].evidence));
  const verified = quotes.filter((q) => q.verified).length;

  return {
    headline: plain(raw.headline),
    questions,
    overall,
    overallScore,
    band: bandFor(overallScore),
    grounding: { quotes: quotes.length, verified, rate: quotes.length ? round1((verified / quotes.length) * 100) : null },
    strengths: list(raw.strengths, 4),
    gaps: list(raw.gaps, 4),
    practiceQuestions: list(raw.practice_questions, 3),
  };
}

const fmt = (n: number | null) => (n === null ? 'n/a' : `${n.toFixed(1)} / 5`);

export function reportToMarkdown(report: Report, setup: Pick<Setup, 'roleTitle' | 'level' | 'type'>, date = new Date()) {
  const lines: string[] = [];
  lines.push(`# Interview report: ${setup.roleTitle}`);
  lines.push('');
  lines.push(`${LEVEL_LABEL[setup.level]} | ${TYPE_LABEL[setup.type]} | ${date.toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(`**Overall:** ${fmt(report.overallScore)}. ${report.band}.`);
  if (report.headline) lines.push('', report.headline);
  lines.push('');
  lines.push('| Dimension | Score |', '| --- | --- |');
  for (const d of DIMS) lines.push(`| ${DIM_LABEL[d]} | ${fmt(report.overall[d])} |`);
  if (report.grounding.rate !== null) {
    lines.push('', `Evidence check: ${report.grounding.verified} of ${report.grounding.quotes} quotes found verbatim in the transcript.`);
  }

  report.questions.forEach((q, i) => {
    lines.push('', `## Question ${i + 1}`, '', `> ${q.question}`, '');
    if (!q.answered) {
      lines.push('Not answered in this session.');
      return;
    }
    lines.push(`**Your answer, summarized:** ${q.answerSummary}`, '');
    for (const d of DIMS) {
      const dim = q.dims[d];
      lines.push(`- **${DIM_LABEL[d]} ${dim.score}/5.** ${dim.rationale}${dim.capped ? ' (capped: no quote found to support a higher score)' : ''}`);
      for (const e of dim.evidence.filter((e) => e.verified)) lines.push(`  - "${e.text}"`);
    }
    lines.push('', `**Try next time:** ${q.improvement}`);
  });

  if (report.strengths.length) lines.push('', '## Strengths', '', ...report.strengths.map((s) => `- ${s}`));
  if (report.gaps.length) lines.push('', '## Gaps', '', ...report.gaps.map((s) => `- ${s}`));
  if (report.practiceQuestions.length) {
    lines.push('', '## Practice questions', '', ...report.practiceQuestions.map((s, i) => `${i + 1}. ${s}`));
  }
  return lines.join('\n') + '\n';
}
