import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bandFor,
  clampScore,
  plain,
  unquote,
  reportToMarkdown,
  scoreReport,
  verifyQuote,
  UNGROUNDED_CAP,
  type RawReport,
} from '../app/lib/report.ts';
import { candidateCorpus } from '../app/lib/transcript.ts';

const turns = [
  { speaker: 'interviewer' as const, text: 'Tell me about a slow page you fixed.' },
  { speaker: 'candidate' as const, text: 'Our LCP was 4.2 seconds. I preloaded the hero image and LCP dropped to 2.1 seconds.' },
  { speaker: 'interviewer' as const, text: 'Tell me about a conflict.' },
  { speaker: 'candidate' as const, text: 'We talked and it was fine.' },
];

const dim = (score: number, evidence: string[] = []) => ({ score, evidence, rationale: 'r' });

function raw(): RawReport {
  return {
    headline: 'Good start.',
    questions: [
      {
        question: 'Tell me about a slow page you fixed.',
        answered: true,
        answer_summary: 'Preloaded the hero image.',
        star: dim(5, ['LCP dropped to 2.1 seconds']),
        clarity: dim(4, ['I preloaded the hero image']),
        depth: dim(5, ['something they never said at all']),
        improvement: 'Name the metric owner.',
      },
      {
        question: 'Tell me about a conflict.',
        answered: true,
        answer_summary: 'Vague.',
        star: dim(2, ['We talked and it was fine']),
        clarity: dim(2),
        depth: dim(1),
        improvement: 'Use STAR.',
      },
      {
        question: 'Why this company?',
        answered: false,
        answer_summary: '',
        star: dim(1),
        clarity: dim(1),
        depth: dim(1),
        improvement: '',
      },
    ],
    strengths: ['Metrics', 'metrics', 'Ownership', ''],
    gaps: ['Conflict stories'],
    practice_questions: ['Q1', 'Q2', 'Q3', 'Q4'],
  };
}

test('clampScore keeps scores integer and in 1..5', () => {
  assert.equal(clampScore(7), 5);
  assert.equal(clampScore(0), 1);
  assert.equal(clampScore(3.6), 4);
  assert.equal(clampScore('4'), 1);
  assert.equal(clampScore(NaN), 1);
});

test('verifyQuote matches normalized substrings and rejects short or invented quotes', () => {
  const corpus = candidateCorpus(turns);
  assert.ok(verifyQuote('“I preloaded the hero image”', corpus));
  assert.ok(verifyQuote('lcp DROPPED to 2.1 seconds', corpus));
  assert.ok(!verifyQuote('fine', corpus));
  assert.ok(!verifyQuote('I rewrote the whole app in Rust', corpus));
  assert.ok(!verifyQuote('Tell me about a conflict', corpus), 'interviewer lines are not evidence');
});

test('scores above the cap need a verified quote', () => {
  const r = scoreReport(raw(), turns);
  const q1 = r.questions[0];
  assert.equal(q1.dims.star.score, 5);
  assert.equal(q1.dims.depth.modelScore, 5);
  assert.equal(q1.dims.depth.score, UNGROUNDED_CAP);
  assert.equal(q1.dims.depth.capped, true);
  assert.equal(q1.average, 4);
});

test('unanswered questions are listed but excluded from averages', () => {
  const r = scoreReport(raw(), turns);
  assert.equal(r.questions.length, 3);
  assert.equal(r.questions[2].answered, false);
  assert.equal(r.questions[2].average, null);
  assert.equal(r.overall.star, 3.5);
  assert.equal(r.overall.clarity, 3);
  assert.equal(r.overall.depth, 2);
  assert.equal(r.overallScore, 2.8);
  assert.equal(r.band, bandFor(2.8));
});

test('grounding rate counts verified quotes', () => {
  const r = scoreReport(raw(), turns);
  assert.deepEqual(r.grounding, { quotes: 4, verified: 3, rate: 75 });
});

test('lists are trimmed, deduped and capped', () => {
  const r = scoreReport(raw(), turns);
  assert.deepEqual(r.strengths, ['Metrics', 'Ownership']);
  assert.deepEqual(r.practiceQuestions, ['Q1', 'Q2', 'Q3']);
});

test('a claimed answer with no verifiable quote is treated as unanswered', () => {
  const r0 = raw();
  r0.questions[1].star.evidence = ['made up words here'];
  const r = scoreReport(r0, turns);
  assert.equal(r.questions[1].answered, false);
  assert.equal(r.overallScore, 4);
});

test('empty report has no overall score', () => {
  const r = scoreReport({ headline: '', questions: [], strengths: [], gaps: [], practice_questions: [] }, []);
  assert.equal(r.overallScore, null);
  assert.equal(r.grounding.rate, null);
  assert.equal(r.band, 'Not enough answers to score');
});

test('markdown export includes scores, verified quotes only, and no dashes', () => {
  const r = scoreReport(raw(), turns);
  const md = reportToMarkdown(r, { roleTitle: 'Frontend engineer', level: 'mid', type: 'mixed' }, new Date('2026-01-02'));
  assert.match(md, /# Interview report: Frontend engineer/);
  assert.match(md, /\*\*Overall:\*\* 2\.8 \/ 5/);
  assert.match(md, /"LCP dropped to 2.1 seconds"/);
  assert.doesNotMatch(md, /something they never said/);
  assert.match(md, /capped: no quote found/);
  assert.match(md, /Not answered in this session/);
  assert.doesNotMatch(md, /[–—]/);
});

test('plain normalizes curly quotes and long dashes from model prose', () => {
  assert.equal(plain('the designer\u2019s view \u2014 and \u201cthis\u201d'), 'the designer\'s view, and "this"');
  assert.equal(plain('2019\u20132021'), '2019-2021');
  assert.equal(plain(undefined), '');
});

test('evidence quotes lose wrapping quote marks the model adds', () => {
  assert.equal(unquote('"I preloaded the hero image"'), 'I preloaded the hero image');
  const r0 = raw();
  r0.questions[0].star.evidence = ['\u201cLCP dropped to 2.1 seconds\u201d'];
  const r = scoreReport(r0, turns);
  assert.deepEqual(r.questions[0].dims.star.evidence, [{ text: 'LCP dropped to 2.1 seconds', verified: true }]);
});
