export type Speaker = 'interviewer' | 'candidate';

export type Turn = { id: string; speaker: Speaker; text: string; final: boolean };

export type ShapedTurn = { speaker: Speaker; text: string };

export type Shaped = {
  turns: ShapedTurn[];
  truncated: boolean;
  candidateWords: number;
  questionsAsked: number;
};

type RealtimeEvent = {
  type?: string;
  item_id?: string;
  delta?: string;
  transcript?: string;
};

function upsert(turns: Turn[], id: string, speaker: Speaker, patch: (t: Turn) => Turn): Turn[] {
  const i = turns.findIndex((t) => t.id === id);
  if (i === -1) return [...turns, patch({ id, speaker, text: '', final: false })];
  const next = turns.slice();
  next[i] = patch(turns[i]);
  return next;
}

// Input transcription completes after the interviewer has started replying, so the
// candidate turn is placed when its audio is committed and filled in later.
export function applyRealtimeEvent(turns: Turn[], ev: RealtimeEvent): Turn[] {
  const id = ev.item_id;
  if (!id || !ev.type) return turns;
  switch (ev.type) {
    case 'input_audio_buffer.committed':
      return upsert(turns, id, 'candidate', (t) => t);
    case 'conversation.item.input_audio_transcription.delta':
      return upsert(turns, id, 'candidate', (t) => (t.final ? t : { ...t, text: t.text + (ev.delta ?? '') }));
    case 'conversation.item.input_audio_transcription.completed':
      return upsert(turns, id, 'candidate', (t) => ({ ...t, text: ev.transcript ?? t.text, final: true }));
    case 'conversation.item.input_audio_transcription.failed':
      return upsert(turns, id, 'candidate', (t) => ({ ...t, final: true }));
    case 'response.output_audio_transcript.delta':
    case 'response.output_text.delta':
      return upsert(turns, id, 'interviewer', (t) => (t.final ? t : { ...t, text: t.text + (ev.delta ?? '') }));
    case 'response.output_audio_transcript.done':
      return upsert(turns, id, 'interviewer', (t) => ({ ...t, text: ev.transcript ?? t.text, final: true }));
    default:
      return turns;
  }
}

export function cleanText(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

export const SHAPE_LIMITS = { maxTurnChars: 1500, maxTotalChars: 24000, maxTurns: 80 };

export function shapeTranscript(input: { speaker: string; text: string }[], limits = SHAPE_LIMITS): Shaped {
  const merged: ShapedTurn[] = [];
  for (const raw of input) {
    if (raw.speaker !== 'interviewer' && raw.speaker !== 'candidate') continue;
    const text = cleanText(typeof raw.text === 'string' ? raw.text : '');
    if (!text) continue;
    const last = merged[merged.length - 1];
    if (last && last.speaker === raw.speaker) last.text = `${last.text} ${text}`;
    else merged.push({ speaker: raw.speaker, text });
  }

  let truncated = false;
  let total = 0;
  const turns: ShapedTurn[] = [];
  for (const t of merged) {
    if (turns.length >= limits.maxTurns) {
      truncated = true;
      break;
    }
    let text = t.text;
    if (text.length > limits.maxTurnChars) {
      text = text.slice(0, limits.maxTurnChars).trimEnd() + ' [cut]';
      truncated = true;
    }
    if (total + text.length > limits.maxTotalChars) {
      truncated = true;
      break;
    }
    total += text.length;
    turns.push({ speaker: t.speaker, text });
  }

  const candidateWords = turns
    .filter((t) => t.speaker === 'candidate')
    .reduce((n, t) => n + t.text.split(' ').filter(Boolean).length, 0);
  const questionsAsked = turns.filter((t) => t.speaker === 'interviewer' && t.text.includes('?')).length;

  return { turns, truncated, candidateWords, questionsAsked };
}

export function toPromptText(turns: ShapedTurn[]) {
  return turns
    .map((t, i) => `[${i + 1}] ${t.speaker === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
    .join('\n');
}

export function normalizeForMatch(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function candidateCorpus(turns: ShapedTurn[]) {
  return normalizeForMatch(
    turns
      .filter((t) => t.speaker === 'candidate')
      .map((t) => t.text)
      .join(' \n '),
  );
}
