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
export const SESSION_SECONDS = Math.min(Math.max(Number(process.env.SESSION_SECONDS ?? 360), 60), 1200);
export const SECRET_TTL_SECONDS = 60;
export const TEXT_MAX_ANSWERS = 6;
