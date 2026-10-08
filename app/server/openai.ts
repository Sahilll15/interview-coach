import OpenAI from 'openai';

export type Provider = 'groq' | 'openai';
export type Route = { provider: Provider; model: string };

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
let client: OpenAI | null = null;
let groqClient: OpenAI | null = null;

export function openai() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  client ??= new OpenAI({ maxRetries: 2, timeout: 60_000 });
  return client;
}

function groq() {
  groqClient ??= new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: GROQ_BASE_URL, maxRetries: 1, timeout: 60_000 });
  return groqClient;
}

/** Text and structured calls: Groq when GROQ_API_KEY is set, with OpenAI as the fallback. */
export function textRoutes(env: Record<string, string | undefined> = process.env): Route[] {
  const routes: Route[] = [];
  if (env.GROQ_API_KEY) routes.push({ provider: 'groq', model: env.GROQ_MODEL || 'openai/gpt-oss-120b' });
  if (env.OPENAI_API_KEY || !routes.length) routes.push({ provider: 'openai', model: env.OPENAI_MODEL ?? 'gpt-5.4-mini' });
  return routes;
}

/** Rate limits, server errors and network failures are worth another provider; a bad request is not. */
export function shouldFallBack(err: unknown) {
  if (err instanceof OpenAI.APIConnectionError) return true;
  const status = (err as { status?: number })?.status;
  return status === 429 || (typeof status === 'number' && status >= 500);
}

export async function withFallback<T>(
  routes: Route[],
  call: (client: OpenAI, route: Route) => Promise<T>,
  clientFor: (provider: Provider) => OpenAI = (p) => (p === 'groq' ? groq() : openai()),
): Promise<{ result: T; route: Route }> {
  for (const [i, route] of routes.entries()) {
    try {
      return { result: await call(clientFor(route.provider), route), route };
    } catch (err) {
      if (i === routes.length - 1 || !shouldFallBack(err)) throw err;
      console.warn(`${route.provider} failed, falling back`, (err as { status?: number })?.status, (err as Error)?.message);
    }
  }
  throw new Error('No model provider is configured');
}
export const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-realtime-mini';
export const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-transcribe';
export const VOICE = process.env.OPENAI_VOICE ?? 'marin';
const requested = Number(process.env.SESSION_SECONDS ?? 270);
// Capped so the server-side hangup (cap + grace) fits inside the session route's maxDuration of 300s (Vercel Hobby limit).
export const SESSION_SECONDS = Math.min(Math.max(Number.isFinite(requested) ? requested : 270, 60), 270);
export const HANGUP_GRACE_SECONDS = 15;
export const TEXT_MAX_ANSWERS = 6;
