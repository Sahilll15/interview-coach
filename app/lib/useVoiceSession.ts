'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Setup } from './setup.ts';
import { applyRealtimeEvent, type Turn } from './transcript.ts';

export type VoiceStatus = 'idle' | 'mic' | 'connecting' | 'live' | 'ended' | 'error';

const WRAP_UP_AT = 30;

function rms(analyser: AnalyserNode | null, buf: Uint8Array<ArrayBuffer>, gain: number) {
  if (!analyser) return 0;
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / buf.length) * gain);
}

export function useVoiceSession(onEnded?: (turns: Turn[]) => void) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [cap, setCap] = useState<number>(360);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const micAn = useRef<AnalyserNode | null>(null);
  const outAn = useRef<AnalyserNode | null>(null);
  const buf = useRef(new Uint8Array(new ArrayBuffer(1024)));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const responding = useRef(false);
  const wrapped = useRef(false);
  const endedCb = useRef(onEnded);

  useEffect(() => {
    endedCb.current = onEnded;
  }, [onEnded]);

  const teardown = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    dcRef.current?.close();
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    micRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
    ctxRef.current?.close().catch(() => {});
    pcRef.current = dcRef.current = micRef.current = ctxRef.current = null;
    micAn.current = outAn.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const send = useCallback((ev: object) => {
    const dc = dcRef.current;
    if (dc?.readyState === 'open') dc.send(JSON.stringify(ev));
  }, []);

  const stop = useCallback(() => {
    teardown();
    setStatus((s) => (s === 'error' ? s : 'ended'));
    setRemaining(0);
    endedCb.current?.(turnsRef.current);
  }, [teardown]);

  const getLevels = useCallback(
    () => ({ mic: rms(micAn.current, buf.current, 4), out: rms(outAn.current, buf.current, 8) }),
    [],
  );

  const start = useCallback(
    async (setup: Setup) => {
      setError(null);
      setTurns([]);
      turnsRef.current = [];
      wrapped.current = false;
      responding.current = false;

      // Ask for the mic first so a denied permission does not spend a session.
      setStatus('mic');
      let mic: MediaStream;
      try {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        setStatus('error');
        setError('Microphone access was blocked. Allow it in your browser, or switch to text mode.');
        return;
      }
      micRef.current = mic;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const ma = ctx.createAnalyser();
      ma.fftSize = 1024;
      ctx.createMediaStreamSource(mic).connect(ma);
      micAn.current = ma;

      setStatus('connecting');
      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        const audio = new Audio();
        audio.autoplay = true;
        audioRef.current = audio;
        pc.ontrack = (e) => {
          const stream = e.streams[0];
          audio.srcObject = stream;
          const oa = ctx.createAnalyser();
          oa.fftSize = 1024;
          ctx.createMediaStreamSource(stream).connect(oa);
          outAn.current = oa;
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') {
            setError('The connection dropped. Your transcript so far is kept.');
            stop();
          }
        };
        mic.getTracks().forEach((t) => pc.addTrack(t, mic));

        const dc = pc.createDataChannel('oai-events');
        dcRef.current = dc;
        dc.onopen = () => send({ type: 'response.create' });
        dc.onmessage = (m) => {
          let ev: { type?: string; error?: { message?: string } };
          try {
            ev = JSON.parse(m.data);
          } catch {
            return;
          }
          if (ev.type === 'response.created') responding.current = true;
          if (ev.type === 'response.done') responding.current = false;
          if (ev.type === 'error') console.warn('realtime error', ev.error?.message);
          const next = applyRealtimeEvent(turnsRef.current, ev);
          if (next !== turnsRef.current) {
            turnsRef.current = next;
            setTurns(next);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        // The server opens the call and schedules its hangup; only the SDP answer comes back.
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ setup, sdp: offer.sdp }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.sdp !== 'string') throw new Error(data.error ?? 'Could not start a session.');
        const capSeconds: number = data.capSeconds ?? 360;
        setCap(capSeconds);
        await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });

        const deadline = Date.now() + capSeconds * 1000;
        setRemaining(capSeconds);
        setStatus('live');
        timer.current = setInterval(() => {
          const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
          setRemaining(left);
          if (left <= WRAP_UP_AT && !wrapped.current) {
            wrapped.current = true;
            send({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'system',
                content: [{ type: 'input_text', text: 'Time is almost up. Thank the candidate in one sentence and close. Ask nothing else.' }],
              },
            });
            if (!responding.current) send({ type: 'response.create' });
          }
          if (left === 0) stop();
        }, 250);
      } catch (e) {
        teardown();
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Could not start a session.');
      }
    },
    [send, stop, teardown],
  );

  const reset = useCallback(() => {
    teardown();
    setStatus('idle');
    setTurns([]);
    turnsRef.current = [];
    setError(null);
    setRemaining(null);
  }, [teardown]);

  return { status, turns, error, remaining, cap, start, stop, reset, getLevels };
}
