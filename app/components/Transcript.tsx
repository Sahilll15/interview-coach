'use client';

import { useEffect, useRef } from 'react';

type Line = { id: string; speaker: 'interviewer' | 'candidate'; text: string; pending?: boolean };

export default function Transcript({ lines, empty }: { lines: Line[]; empty: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [lines]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite" aria-relevant="additions text">
      {lines.length === 0 && <p className="py-10 text-center text-sm text-ink-faint">{empty}</p>}
      {lines.map((l) => (
        <div key={l.id} className={`flex animate-rise ${l.speaker === 'candidate' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[0.94rem] leading-relaxed ${
              l.speaker === 'candidate'
                ? 'rounded-br-md bg-[linear-gradient(135deg,#ece7ff,#f6e9fb)] text-ink'
                : 'rounded-bl-md border border-line bg-white text-ink'
            }`}
          >
            <span className="mb-0.5 block text-[0.7rem] font-semibold uppercase tracking-wider text-ink-faint">
              {l.speaker === 'candidate' ? 'You' : 'Interviewer'}
            </span>
            {l.text || <span className="text-ink-faint italic">{l.pending ? 'transcribing...' : '...'}</span>}
          </div>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}
