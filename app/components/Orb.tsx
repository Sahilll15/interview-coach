'use client';

import { useEffect, useRef } from 'react';

export type Levels = { mic: number; out: number };

type Props = {
  size?: string;
  getLevels?: () => Levels;
  state?: 'idle' | 'thinking' | 'live';
  className?: string;
};

export default function Orb({ size = '240px', getLevels, state = 'idle', className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getLevels) return;
    let raf = 0;
    const smooth = { mic: 0, out: 0 };
    const tick = () => {
      const l = getLevels();
      smooth.mic += (l.mic - smooth.mic) * 0.25;
      smooth.out += (l.out - smooth.out) * 0.25;
      const el = ref.current;
      if (el) {
        el.style.setProperty('--mic', smooth.mic.toFixed(3));
        el.style.setProperty('--out', smooth.out.toFixed(3));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevels]);

  return (
    <div
      ref={ref}
      className={`orb orb-${state} ${className}`}
      style={{ ['--orb-size' as string]: size }}
      aria-hidden="true"
    >
      <div className="orb-halo" />
      <div className="orb-rays" />
      <div className="orb-well">
        <div className="orb-scale orb-scale-out">
          <div className="orb-blob" />
        </div>
        <div className="orb-scale orb-scale-mic">
          <div className="orb-blob orb-blob-mic" />
        </div>
        <div className="orb-gloss" />
      </div>
    </div>
  );
}
