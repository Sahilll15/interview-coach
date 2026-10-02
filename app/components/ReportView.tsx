'use client';

import { useState } from 'react';
import { DIM_LABEL, DIMS, reportToMarkdown, type Report, type ScoredQuestion } from '../lib/report.ts';
import { LEVEL_LABEL, TYPE_LABEL, type Setup } from '../lib/setup.ts';
import type { ShapedTurn } from '../lib/transcript.ts';

export type ReportMeta = { model: string; ms: number; inputTokens: number | null; outputTokens: number | null; truncated: boolean };

type Props = {
  report: Report;
  meta: ReportMeta | null;
  setup: Setup;
  transcript: ShapedTurn[];
  onAgain: () => void;
  onNew: () => void;
};

function tone(score: number | null) {
  if (score === null) return 'bg-line text-ink-soft';
  if (score >= 4) return 'bg-good-bg text-good';
  if (score >= 3) return 'bg-warn-bg text-warn';
  return 'bg-bad-bg text-bad';
}

function Bar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono tabular-nums text-ink-soft">{value === null ? 'n/a' : value.toFixed(1)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-violet-soft">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#ff9fd6,#8a5cff,#3cc6ff)] transition-[width] duration-700 ease-out"
          style={{ width: `${value === null ? 0 : (value / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}

function QuestionCard({ q, i }: { q: ScoredQuestion; i: number }) {
  return (
    <article className="glass animate-rise rounded-[24px] p-5 sm:p-6" style={{ animationDelay: `${i * 70}ms` }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Question {i + 1}</p>
          <h3 className="mt-1 font-serif text-2xl leading-snug">{q.question}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 font-mono text-sm font-semibold ${tone(q.average)}`}>
          {q.average === null ? 'Skipped' : `${q.average.toFixed(1)} / 5`}
        </span>
      </div>

      {!q.answered ? (
        <p className="mt-3 text-sm text-ink-soft">Not answered in this session, so it does not count toward your scores.</p>
      ) : (
        <>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">{q.answerSummary}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {DIMS.map((d) => {
              const dim = q.dims[d];
              const quotes = dim.evidence.filter((e) => e.verified);
              return (
                <div key={d} className="rounded-2xl border border-line bg-white/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{DIM_LABEL[d]}</span>
                    <span className="flex gap-0.5" aria-label={`${dim.score} out of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={`h-1.5 w-3.5 rounded-full ${n <= dim.score ? 'bg-violet' : 'bg-violet-soft'}`} />
                      ))}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{dim.rationale}</p>
                  {dim.capped && (
                    <p className="mt-2 text-xs text-warn">Model said {dim.modelScore}. Capped at {dim.score} because no supporting quote was found.</p>
                  )}
                  {quotes.map((e) => (
                    <blockquote key={e.text} className="mt-2 border-l-2 border-violet/40 pl-2.5 text-sm italic text-ink">
                      &quot;{e.text}&quot;
                    </blockquote>
                  ))}
                </div>
              );
            })}
          </div>
          {q.improvement && (
            <p className="mt-4 rounded-2xl bg-violet-wash px-4 py-3 text-sm leading-relaxed">
              <span className="font-semibold text-violet-deep">Try next time. </span>
              {q.improvement}
            </p>
          )}
        </>
      )}
    </article>
  );
}

export default function ReportView({ report, meta, setup, transcript, onAgain, onNew }: Props) {
  const [showTranscript, setShowTranscript] = useState(false);
  const title = setup.roleTitle || 'Custom role';

  const download = () => {
    const md = reportToMarkdown(report, { ...setup, roleTitle: title });
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section className="glass-strong animate-rise grid gap-6 rounded-[28px] p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center">
        <div className="text-center md:pr-8 md:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Overall</p>
          <p className="font-serif text-7xl leading-none tracking-tight sm:text-8xl">
            {report.overallScore === null ? 'n/a' : report.overallScore.toFixed(1)}
            <span className="ml-1 text-3xl text-ink-faint">/ 5</span>
          </p>
          <p className="mt-2 font-medium text-violet-deep">{report.band}</p>
        </div>
        <div className="space-y-4">
          <div>
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{title}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {LEVEL_LABEL[setup.level]} &middot; {TYPE_LABEL[setup.type]} &middot; {report.questions.length} question{report.questions.length === 1 ? '' : 's'}
            </p>
          </div>
          {report.headline && <p className="leading-relaxed">{report.headline}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            {DIMS.map((d) => (
              <Bar key={d} label={DIM_LABEL[d]} value={report.overall[d]} />
            ))}
          </div>
          {report.grounding.rate !== null && (
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-ink-soft ring-1 ring-line">
              <span className={`size-1.5 rounded-full ${report.grounding.rate >= 80 ? 'bg-good' : 'bg-warn'}`} />
              Evidence check: {report.grounding.verified} of {report.grounding.quotes} quotes found word for word in your answers
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn-dark" onClick={download}>Download markdown</button>
        <button className="btn-ghost" onClick={onAgain}>Practice again</button>
        <button className="btn-ghost" onClick={onNew}>New role</button>
      </div>

      <div className="space-y-4">
        {report.questions.map((q, i) => (
          <QuestionCard key={i} q={q} i={i} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass rounded-[24px] p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Strengths</h2>
          <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed">
            {report.strengths.map((s) => (
              <li key={s} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-good" />{s}</li>
            ))}
          </ul>
        </section>
        <section className="glass rounded-[24px] p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Gaps to work on</h2>
          <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed">
            {report.gaps.map((s) => (
              <li key={s} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-pink" />{s}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="glass rounded-[24px] p-5 sm:p-6">
        <h2 className="font-serif text-2xl">Practice next</h2>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {report.practiceQuestions.map((q, i) => (
            <li key={q} className="rounded-2xl border border-line bg-white/70 p-4 text-[0.95rem] leading-relaxed">
              <span className="font-mono text-xs text-violet-deep">0{i + 1}</span>
              <p className="mt-1">{q}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass rounded-[24px] p-5 sm:p-6">
        <button
          className="flex w-full items-center justify-between text-left"
          aria-expanded={showTranscript}
          onClick={() => setShowTranscript((v) => !v)}
        >
          <h2 className="font-serif text-2xl">Transcript</h2>
          <span className="text-sm text-ink-soft">{showTranscript ? 'Hide' : 'Show'}</span>
        </button>
        {showTranscript && (
          <div className="mt-3 space-y-2 text-sm leading-relaxed">
            {transcript.map((t, i) => (
              <p key={i}>
                <span className={`font-semibold ${t.speaker === 'candidate' ? 'text-violet-deep' : ''}`}>
                  {t.speaker === 'candidate' ? 'You' : 'Interviewer'}:
                </span>{' '}
                {t.text}
              </p>
            ))}
          </div>
        )}
      </section>

      {meta && (
        <p className="text-center text-xs text-ink-faint">
          Scored by {meta.model} in {(meta.ms / 1000).toFixed(1)}s
          {meta.inputTokens !== null && ` using ${meta.inputTokens.toLocaleString()} input and ${meta.outputTokens?.toLocaleString()} output tokens`}
          {meta.truncated && '. Long transcript was trimmed before scoring'}.
        </p>
      )}
    </div>
  );
}
