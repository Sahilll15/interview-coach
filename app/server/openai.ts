import OpenAI from 'openai';

let client: OpenAI | null = null;

export function openai() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  client ??= new OpenAI({ maxRetries: 2, timeout: 60_000 });
  return client;
}

export const TEXT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini';
export const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-realtime-mini';
export const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-transcribe';
export const VOICE = process.env.OPENAI_VOICE ?? 'marin';
const requested = Number(process.env.SESSION_SECONDS ?? 270);
// Capped so the server-side hangup (cap + grace) fits inside the session route's maxDuration of 300s (Vercel Hobby limit).
export const SESSION_SECONDS = Math.min(Math.max(Number.isFinite(requested) ? requested : 270, 60), 270);
export const HANGUP_GRACE_SECONDS = 15;
export const TEXT_MAX_ANSWERS = 6;
