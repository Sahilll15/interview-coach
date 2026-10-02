import { openai } from './openai.ts';

// Calls this instance still has to hang up, by deadline. A backstop for timers that never fired.
const pending = new Map<string, number>();

export function callIdFrom(location: string | null) {
  const id = location?.split('?')[0].split('/').filter(Boolean).at(-1);
  return id && /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null;
}

export async function hangup(callId: string) {
  pending.delete(callId);
  try {
    await openai().realtime.calls.hangup(callId);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status !== 404) console.error('realtime hangup failed', status, (err as Error)?.message);
  }
}

/** Waits until the deadline, then ends the call on OpenAI's side. */
export async function hangupAt(callId: string, deadline: number) {
  pending.set(callId, deadline);
  await new Promise((r) => setTimeout(r, Math.max(0, deadline - Date.now())));
  if (pending.has(callId)) await hangup(callId);
}

export function sweepOverdue(now = Date.now()) {
  for (const [id, deadline] of pending) if (deadline <= now) void hangup(id);
}
