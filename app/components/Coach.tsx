'use client';

import { useCallback, useState } from 'react';
import Orb from './Orb';
import ReportView, { type ReportMeta } from './ReportView';
import SetupPanel, { type Mode } from './SetupPanel';
import TextStage from './TextStage';
import VoiceStage from './VoiceStage';
import type { Report } from '../lib/report.ts';
import { SAMPLE_INTERVIEWS, SAMPLE_ROLES } from '../lib/samples.ts';
import { parseSetup, type Setup } from '../lib/setup.ts';
import { shapeTranscript, type ShapedTurn } from '../lib/transcript.ts';
import { useVoiceSession } from '../lib/useVoiceSession.ts';

type Stage = 'setup' | 'voice' | 'text' | 'scoring' | 'report';

const EMPTY: Setup = { roleTitle: '', jobDescription: '', level: 'mid', type: 'mixed' };

const CHIPS = [
  { text: 'One question at a time', cls: 'left-[2%] top-[18%]', delay: '0s' },
  { text: 'STAR, clarity, depth', cls: 'right-[0%] top-[10%]', delay: '1.2s' },
  { text: 'Quotes from your answers', cls: 'left-[6%] bottom-[8%]', delay: '2.1s' },
  { text: '6 minute sessions', cls: 'right-[4%] bottom-[16%]', delay: '0.6s' },
];

function Nav({ onHome }: { onHome: () => void }) {
  return (
    <header className="sticky top-3 z-20 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4">
      <nav className="glass flex items-center gap-1 rounded-full py-1.5 pl-2 pr-2 sm:pr-4" aria-label="Main">
        <button onClick={onHome} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 font-semibold">
          <Orb size="26px" state="idle" />
          Interview Coach
        </button>
        <a href="#how" onClick={onHome} className="hidden rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-white hover:text-ink sm:block">
          How it works
        </a>
      </nav>
      <a href="#start" onClick={onHome} className="glass rounded-full px-4 py-2.5 text-sm font-medium hover:bg-white">
        Start
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-10 text-center sm:pt-14">
      <div className="relative flex w-full justify-center py-6 sm:py-10">
        <Orb size="clamp(170px, 30vw, 250px)" state="idle" />
        {CHIPS.map((c) => (
          <span
            key={c.text}
            className={`glass absolute animate-float rounded-full px-3.5 py-2 text-xs font-medium text-ink sm:text-sm ${c.cls} hidden items-center gap-2 sm:inline-flex`}
            style={{ animationDelay: c.delay }}
          >
            <span className="size-1.5 rounded-full bg-[linear-gradient(135deg,#ff9fd6,#8a5cff)]" />
            {c.text}
          </span>
        ))}
      </div>
      <span className="glass mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium sm:text-sm">
        <span className="size-1.5 rounded-full bg-violet" />
        Mock interviews, out loud
      </span>
      <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[1.02] tracking-tight sm:text-7xl">
        <span className="sr-only">Interview Coach, AI mock interview practice: </span>
        Practice the interview <em className="text-violet-deep">before</em> it counts
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
        Paste a job description and talk to an interviewer for six minutes. You get a report that scores every answer and quotes your own words back to you.
      </p>
    </section>
  );
}

function HowItWorks() {
  const items = [
    ['Talk', 'A realtime voice interviewer asks one question at a time and follows up when an answer is thin. Your speech is transcribed live.'],
    ['Score', 'Each answer is scored 1 to 5 for STAR structure, clarity and depth. Every quote is checked against the transcript before it counts.'],
    ['Practice', 'You get one concrete fix per answer, your strengths and gaps, and three new questions aimed at the gaps.'],
  ];
  return (
    <section id="how" aria-labelledby="how-title" className="mx-auto w-full max-w-5xl px-4">
      <h2 id="how-title" className="text-center font-serif text-4xl tracking-tight sm:text-5xl">How it works</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map(([t, d], i) => (
          <div key={t} className="glass rounded-[24px] p-6">
            <span className="font-mono text-xs text-violet-deep">0{i + 1}</span>
            <h3 className="mt-2 font-serif text-3xl">{t}</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{d}</p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-sm text-ink-faint">
        No account. Nothing is stored on the server. Audio goes straight from your browser to OpenAI.
      </p>
    </section>
  );
}

function Scoring({ error, onRetry, onBack }: { error: string | null; onRetry: (() => void) | null; onBack: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 py-6 text-center">
      <Orb size="min(50vw, 220px)" state={error ? 'idle' : 'thinking'} />
      {error ? (
        <>
          <h1 className="font-serif text-4xl">We could not score this one</h1>
          <p role="alert" className="max-w-md rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad">{error}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {onRetry && <button className="btn-dark" onClick={onRetry}>Try again</button>}
            <button className="btn-ghost" onClick={onBack}>Back to setup</button>
          </div>
        </>
      ) : (
        <>
          <h1 className="font-serif text-4xl" aria-live="polite">Reading your answers</h1>
          <p className="text-ink-soft">Scoring each question and checking every quote against the transcript.</p>
          <div className="w-full space-y-3" aria-hidden="true">
            <div className="skeleton h-36 w-full" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        </>
      )}
    </div>
  );
}

export default function Coach() {
  const [stage, setStage] = useState<Stage>('setup');
  const [setup, setSetup] = useState<Setup>(EMPTY);
  const [mode, setMode] = useState<Mode>('voice');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [transcript, setTranscript] = useState<ShapedTurn[]>([]);
  const [scoredSetup, setScoredSetup] = useState<Setup>(EMPTY);

  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const score = useCallback(async (turns: { speaker: string; text: string }[], s: Setup) => {
    const shaped = shapeTranscript(turns).turns;
    setScoredSetup(s);
    setTranscript(shaped);
    setScoreError(null);
    setStage('scoring');
    top();
    if (shapeTranscript(turns).candidateWords < 15) {
      setScoreError('Not enough answers to score yet. Answer at least one question, then end the interview.');
      return;
    }
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ setup: s, transcript: shaped }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Scoring failed.');
      setReport(data.report);
      setMeta(data.meta ?? null);
      setStage('report');
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : 'Scoring failed.');
    }
  }, []);

  const onVoiceEnded = useCallback((turns: { speaker: string; text: string }[]) => score(turns, setup), [score, setup]);
  const voice = useVoiceSession(onVoiceEnded);

  const begin = (m: Mode = mode) => {
    const p = parseSetup(setup);
    if (!p.ok) {
      setSetupError(p.error);
      return;
    }
    setSetupError(null);
    setMode(m);
    top();
    if (m === 'voice') {
      setStage('voice');
      voice.start(setup);
    } else {
      voice.reset();
      setStage('text');
    }
  };

  const home = () => {
    voice.reset();
    setStage('setup');
  };

  const sample = (id: string) => {
    const s = SAMPLE_INTERVIEWS.find((x) => x.id === id);
    const role = SAMPLE_ROLES.find((r) => r.id === s?.roleId);
    if (!s || !role) return;
    setSetup(role.setup);
    score(s.transcript, role.setup);
  };

  return (
    <div className="flex min-h-dvh flex-col gap-10 pb-16">
      <Nav onHome={() => stage !== 'voice' && stage !== 'text' && home()} />
      {stage === 'setup' && (
        <>
          <Hero />
          <div className="px-4">
            <SetupPanel
              setup={setup}
              onChange={(s) => {
                setSetup(s);
                setSetupError(null);
              }}
              mode={mode}
              onMode={setMode}
              onStart={() => begin()}
              onSample={sample}
              error={setupError}
            />
          </div>
          <HowItWorks />
        </>
      )}
      <main className="px-4" hidden={stage === 'setup'}>
        {stage === 'voice' && (
          <VoiceStage
            title={setup.roleTitle || 'Custom role'}
            status={voice.status}
            turns={voice.turns}
            error={voice.error}
            remaining={voice.remaining}
            cap={voice.cap}
            getLevels={voice.getLevels}
            onEnd={() => voice.stop()}
            onRetry={() => begin('voice')}
            onText={() => begin('text')}
            onBack={home}
          />
        )}
        {stage === 'text' && <TextStage setup={setup} onEnd={(t) => score(t, setup)} onBack={home} />}
        {stage === 'scoring' && (
          <Scoring
            error={scoreError}
            onRetry={transcript.length ? () => score(transcript, scoredSetup) : null}
            onBack={home}
          />
        )}
        {stage === 'report' && report && (
          <ReportView
            report={report}
            meta={meta}
            setup={scoredSetup}
            transcript={transcript}
            onAgain={() => begin()}
            onNew={() => {
              setSetup(EMPTY);
              home();
            }}
          />
        )}
      </main>
    </div>
  );
}
