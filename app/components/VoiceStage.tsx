'use client';

import type { Levels } from './Orb';
import Orb from './Orb';
import Transcript from './Transcript';
import type { Turn } from '../lib/transcript.ts';
import type { VoiceStatus } from '../lib/useVoiceSession.ts';

type Props = {
  title: string;
  status: VoiceStatus;
  turns: Turn[];
  error: string | null;
  remaining: number | null;
  cap: number;
  getLevels: () => Levels;
  onEnd: () => void;
  onRetry: () => void;
  onText: () => void;
  onBack: () => void;
};

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: 'Getting ready',
  mic: 'Waiting for microphone permission',
  connecting: 'Connecting to your interviewer',
  live: 'Live',
  ended: 'Session ended',
  error: 'Could not start',
};

export function clock(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function VoiceStage(p: Props) {
  const left = p.remaining ?? p.cap;
  const pct = Math.max(0, Math.min(1, left / p.cap));
  const low = p.status === 'live' && left <= 30;
  const lastQ = [...p.turns].reverse().find((t) => t.speaker === 'interviewer' && t.text)?.text;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
      <section aria-label="Interview" className="relative flex min-h-[460px] flex-col items-center justify-center gap-6 py-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium">
            <span className={`size-2 rounded-full ${p.status === 'live' ? 'bg-good animate-pulse' : p.status === 'error' ? 'bg-bad' : 'bg-violet'}`} />
            {STATUS_LABEL[p.status]}
          </span>
          <span
            className={`glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-sm tabular-nums ${low ? 'text-bad' : ''}`}
            role="timer"
            aria-label={`${clock(left)} remaining`}
          >
            <svg viewBox="0 0 20 20" className="size-4 -rotate-90" aria-hidden="true">
              <circle cx="10" cy="10" r="8" fill="none" stroke="#e6e2f3" strokeWidth="3" />
              <circle cx="10" cy="10" r="8" fill="none" stroke={low ? '#b4233c' : '#6a46f5'} strokeWidth="3" strokeDasharray={`${pct * 50.3} 50.3`} strokeLinecap="round" />
            </svg>
            {clock(left)}
          </span>
        </div>

        <Orb size="min(68vw, 320px)" getLevels={p.getLevels} state={p.status === 'live' ? 'live' : 'thinking'} />

        <p className="max-w-md text-center font-serif text-2xl leading-snug text-ink sm:text-3xl" aria-live="polite">
          {p.status === 'error' ? 'Something got in the way' : lastQ ? lastQ : p.status === 'live' ? 'Your interviewer is about to speak' : 'One moment'}
        </p>

        {p.status === 'error' ? (
          <div className="flex max-w-md flex-col items-center gap-3 text-center">
            <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad">{p.error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-dark" onClick={p.onText}>Switch to text mode</button>
              <button className="btn-ghost" onClick={p.onRetry}>Try voice again</button>
              <button className="btn-ghost" onClick={p.onBack}>Back</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            <button className="btn-dark" onClick={p.onEnd} disabled={p.status !== 'live'}>
              End and get my report
            </button>
            <button className="btn-ghost" onClick={p.onBack}>Cancel</button>
          </div>
        )}
        <p className="text-xs text-ink-faint">Speak naturally. The interviewer waits for you to finish. Headphones help.</p>
      </section>

      <aside aria-label="Live transcript" className="glass flex max-h-[70vh] min-h-[320px] flex-col rounded-[28px] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Live transcript</h2>
          <span className="truncate pl-3 text-xs text-ink-faint">{p.title}</span>
        </div>
        <Transcript
          empty="The conversation will appear here as you talk."
          lines={p.turns.map((t) => ({ id: t.id, speaker: t.speaker, text: t.text, pending: !t.final }))}
        />
      </aside>
    </div>
  );
}
