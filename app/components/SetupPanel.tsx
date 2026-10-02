'use client';

import { SAMPLE_INTERVIEWS, SAMPLE_ROLES } from '../lib/samples.ts';
import { JD_MAX, LEVEL_LABEL, LEVELS, TYPE_LABEL, TYPES, type Setup } from '../lib/setup.ts';

export type Mode = 'voice' | 'text';

type Props = {
  setup: Setup;
  onChange: (s: Setup) => void;
  mode: Mode;
  onMode: (m: Mode) => void;
  onStart: () => void;
  onSample: (id: string) => void;
  error: string | null;
};

export default function SetupPanel({ setup, onChange, mode, onMode, onStart, onSample, error }: Props) {
  const activeRole = SAMPLE_ROLES.find((r) => r.setup.jobDescription === setup.jobDescription)?.id;
  const len = setup.jobDescription.length;

  return (
    <section id="start" aria-labelledby="setup-title" className="glass-strong mx-auto w-full max-w-3xl rounded-[28px] p-5 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="setup-title" className="font-serif text-3xl tracking-tight sm:text-4xl">
          Set up your interview
        </h2>
        <p className="text-sm text-ink-faint">Takes about 6 minutes</p>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-ink-soft">Start from a sample role</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAMPLE_ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={activeRole === r.id}
              onClick={() => onChange(r.setup)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeRole === r.id
                  ? 'border-violet bg-violet-soft text-violet-deep'
                  : 'border-line bg-white/70 text-ink hover:border-line-strong hover:bg-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink-soft">Role title</span>
          <input
            className="field"
            value={setup.roleTitle}
            onChange={(e) => onChange({ ...setup, roleTitle: e.target.value })}
            placeholder="e.g. Backend engineer"
            maxLength={80}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="flex justify-between text-sm font-medium text-ink-soft">
            <span>Job description</span>
            <span className={`font-mono text-xs ${len > JD_MAX ? 'text-bad' : 'text-ink-faint'}`}>
              {len.toLocaleString()} / {JD_MAX.toLocaleString()}
            </span>
          </span>
          <textarea
            className="field min-h-40 resize-y leading-relaxed"
            value={setup.jobDescription}
            onChange={(e) => onChange({ ...setup, jobDescription: e.target.value })}
            placeholder="Paste the job posting. The interviewer uses it to pick questions."
          />
        </label>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-soft" id="level-label">Level</p>
          <div className="seg mt-2" role="group" aria-labelledby="level-label">
            {LEVELS.map((l) => (
              <button key={l} type="button" aria-pressed={setup.level === l} onClick={() => onChange({ ...setup, level: l })}>
                {LEVEL_LABEL[l]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-soft" id="type-label">Interview type</p>
          <div className="seg mt-2" role="group" aria-labelledby="type-label">
            {TYPES.map((t) => (
              <button key={t} type="button" aria-pressed={setup.type === t} onClick={() => onChange({ ...setup, type: t })}>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Answer mode">
        {(
          [
            ['voice', 'Speak your answers', 'Live voice interview over WebRTC. Needs a mic.'],
            ['text', 'Type your answers', 'No mic needed. Same interviewer, same report.'],
          ] as const
        ).map(([m, title, sub]) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => onMode(m)}
            className={`rounded-2xl border p-4 text-left transition ${
              mode === m ? 'border-violet bg-violet-wash shadow-[0_0_0_4px_rgba(106,70,245,0.1)]' : 'border-line bg-white/60 hover:bg-white'
            }`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className={`size-3 rounded-full border-2 ${mode === m ? 'border-violet bg-violet' : 'border-line-strong'}`} />
              {title}
            </span>
            <span className="mt-1 block text-sm text-ink-soft">{sub}</span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="btn-dark w-full sm:w-auto" onClick={onStart}>
          {mode === 'voice' ? 'Start voice interview' : 'Start text interview'}
          <span aria-hidden="true">&rarr;</span>
        </button>
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span>Or score a sample:</span>
          {SAMPLE_INTERVIEWS.map((s) => (
            <button key={s.id} type="button" onClick={() => onSample(s.id)} className="rounded-full px-2 py-1 font-medium text-violet-deep underline decoration-violet/30 underline-offset-4 hover:decoration-violet">
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
