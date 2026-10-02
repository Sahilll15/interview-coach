'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Orb from './Orb';
import Transcript from './Transcript';
import type { Setup } from '../lib/setup.ts';
import type { ShapedTurn } from '../lib/transcript.ts';

type Props = {
  setup: Setup;
  onEnd: (turns: ShapedTurn[]) => void;
  onBack: () => void;
};

const MAX_ANSWER = 3000;

export default function TextStage({ setup, onEnd, onBack }: Props) {
  const [turns, setTurns] = useState<ShapedTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [maxAnswers, setMaxAnswers] = useState(6);
  const started = useRef(false);
  const levels = useRef({ mic: 0, out: 0, outUntil: 0 });

  const getLevels = useCallback(() => {
    const l = levels.current;
    l.mic *= 0.92;
    const speaking = performance.now() < l.outUntil;
    l.out = speaking ? 0.45 + 0.35 * Math.abs(Math.sin(performance.now() / 140)) : l.out * 0.9;
    return { mic: l.mic, out: l.out };
  }, []);

  const ask = useCallback(
    async (history: ShapedTurn[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/interviewer', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ setup, transcript: history }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? 'The interviewer did not respond.');
        setMaxAnswers(data.maxAnswers ?? 6);
        setTurns([...history, { speaker: 'interviewer', text: data.message }]);
        levels.current.outUntil = performance.now() + Math.min(4000, 600 + data.message.length * 25);
        if (data.closing) setClosed(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The interviewer did not respond.');
      } finally {
        setLoading(false);
      }
    },
    [setup],
  );

  useEffect(() => {
    // Guard against the double mount in dev, which would spend two sessions.
    if (started.current) return;
    started.current = true;
    ask([]);
  }, [ask]);

  const answers = turns.filter((t) => t.speaker === 'candidate').length;
  const lastIsInterviewer = turns.length > 0 && turns[turns.length - 1].speaker === 'interviewer';
  const canSend = !loading && !closed && lastIsInterviewer && draft.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    const next = [...turns, { speaker: 'candidate' as const, text: draft.trim().slice(0, MAX_ANSWER) }];
    setTurns(next);
    setDraft('');
    ask(next);
  };

  const retry = () => ask(turns);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section aria-label="Interview status" className="flex flex-col items-center justify-center gap-5 py-4">
        <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium">
          <span className={`size-2 rounded-full ${loading ? 'bg-violet animate-pulse' : closed ? 'bg-good' : 'bg-pink'}`} />
          {loading ? 'Interviewer is thinking' : closed ? 'Interview complete' : 'Your turn'}
        </span>
        <Orb size="min(52vw, 240px)" getLevels={getLevels} state={loading ? 'thinking' : 'live'} />
        <p className="font-mono text-sm text-ink-soft">
          Answer {Math.min(answers + (closed ? 0 : 1), maxAnswers)} of {maxAnswers}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-dark" onClick={() => onEnd(turns)} disabled={answers === 0 || loading}>
            {closed ? 'Score my interview' : 'End and get my report'}
          </button>
          <button className="btn-ghost" onClick={onBack}>Cancel</button>
        </div>
      </section>

      <section aria-label="Text interview" className="glass flex max-h-[78vh] min-h-[460px] flex-col rounded-[28px] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Text interview</h2>
          <span className="truncate pl-3 text-xs text-ink-faint">{setup.roleTitle || 'Custom role'}</span>
        </div>
        <Transcript
          empty={loading ? 'Your interviewer is preparing the first question...' : 'No messages yet.'}
          lines={turns.map((t, i) => ({ id: String(i), ...t }))}
        />
        {loading && turns.length > 0 && (
          <div className="mt-2 flex gap-1 px-2" aria-label="Interviewer is typing">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-bounce rounded-full bg-violet/60" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}
        {error && (
          <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad">
            <span>{error}</span>
            {!lastIsInterviewer && <button className="font-semibold underline" onClick={retry}>Retry</button>}
          </div>
        )}
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="sr-only" htmlFor="answer">Your answer</label>
          <textarea
            id="answer"
            className="field min-h-[52px] flex-1 resize-none"
            rows={3}
            maxLength={MAX_ANSWER}
            value={draft}
            disabled={closed}
            placeholder={closed ? 'The interview is over. Score it when ready.' : 'Type your answer. Enter to send, Shift+Enter for a new line.'}
            onChange={(e) => {
              setDraft(e.target.value);
              levels.current.mic = Math.min(1, levels.current.mic + 0.35);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button type="submit" className="btn-dark !px-4" disabled={!canSend} aria-label="Send answer">
            <svg viewBox="0 0 20 20" className="size-5" fill="currentColor" aria-hidden="true">
              <path d="M3.4 2.6a.75.75 0 0 1 .82-.12l13 6.75a.75.75 0 0 1 0 1.33l-13 6.75a.75.75 0 0 1-1.05-.9L5.2 10 3.17 3.6a.75.75 0 0 1 .23-1Z" />
            </svg>
          </button>
        </form>
      </section>
    </div>
  );
}
