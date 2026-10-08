import { test } from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { shouldFallBack, textRoutes, withFallback, type Provider, type Route } from '../app/server/openai.ts';

const fakeClients = (p: Provider) => ({ provider: p }) as unknown as OpenAI;
const apiError = (status: number) => Object.assign(new Error(`status ${status}`), { status });

test('textRoutes uses OpenAI alone when there is no Groq key', () => {
  assert.deepEqual(textRoutes({ OPENAI_API_KEY: 'sk' }), [{ provider: 'openai', model: 'gpt-5.4-mini' }]);
  assert.deepEqual(textRoutes({}), [{ provider: 'openai', model: 'gpt-5.4-mini' }]);
  assert.deepEqual(textRoutes({ OPENAI_MODEL: 'gpt-x' }), [{ provider: 'openai', model: 'gpt-x' }]);
});

test('textRoutes puts Groq first and keeps OpenAI as fallback only when its key is set', () => {
  assert.deepEqual(textRoutes({ GROQ_API_KEY: 'g' }), [{ provider: 'groq', model: 'openai/gpt-oss-120b' }]);
  assert.deepEqual(textRoutes({ GROQ_API_KEY: 'g', GROQ_MODEL: 'llama', OPENAI_API_KEY: 'sk' }), [
    { provider: 'groq', model: 'llama' },
    { provider: 'openai', model: 'gpt-5.4-mini' },
  ]);
});

test('shouldFallBack covers 429, 5xx and network errors but not client errors', () => {
  assert.equal(shouldFallBack(apiError(429)), true);
  assert.equal(shouldFallBack(apiError(500)), true);
  assert.equal(shouldFallBack(apiError(503)), true);
  assert.equal(shouldFallBack(new OpenAI.APIConnectionError({ message: 'down' })), true);
  assert.equal(shouldFallBack(new OpenAI.APIConnectionTimeoutError()), true);
  assert.equal(shouldFallBack(apiError(400)), false);
  assert.equal(shouldFallBack(apiError(401)), false);
  assert.equal(shouldFallBack(new Error('bug')), false);
});

const both: Route[] = [
  { provider: 'groq', model: 'g-model' },
  { provider: 'openai', model: 'o-model' },
];

test('withFallback retries once on OpenAI with its own model after a Groq 429', async () => {
  const seen: string[] = [];
  const out = await withFallback(
    both,
    async (client, route) => {
      seen.push(`${(client as unknown as { provider: string }).provider}:${route.model}`);
      if (route.provider === 'groq') throw apiError(429);
      return 'ok';
    },
    fakeClients,
  );
  assert.deepEqual(seen, ['groq:g-model', 'openai:o-model']);
  assert.deepEqual(out, { result: 'ok', route: both[1] });
});

test('withFallback does not fall back on a 400 and rethrows the last error', async () => {
  let calls = 0;
  await assert.rejects(
    withFallback(both, async () => { calls++; throw apiError(400); }, fakeClients),
    /status 400/,
  );
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(
    withFallback(both, async () => { calls++; throw apiError(503); }, fakeClients),
    /status 503/,
  );
  assert.equal(calls, 2);
});

test('withFallback with Groq only surfaces the Groq error', async () => {
  await assert.rejects(
    withFallback([both[0]], async () => { throw apiError(429); }, fakeClients),
    /status 429/,
  );
});
