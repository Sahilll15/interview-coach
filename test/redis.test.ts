import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peek, take } from '../app/server/redis.ts';
import { createBudget, createLimits, tooMany } from '../app/server/ratelimit.ts';
import { fakeRedis } from './fake-redis.ts';

const lim = { limit: 2, windowMs: 60_000 };

test('take counts up to the limit and the first hit opens the window', async () => {
  const f = fakeRedis({ now: 1000 });
  const a = await take(f.redis, 'k', 2, 60_000, 1000);
  assert.deepEqual(a, { ok: true, remaining: 1, resetAt: 61_000 });
  f.clock.now = 31_000;
  const b = await take(f.redis, 'k', 2, 60_000, 31_000);
  assert.deepEqual(b, { ok: true, remaining: 0, resetAt: 61_000 });
});

test('take over the limit is refused and does not increment', async () => {
  const f = fakeRedis({ now: 0 });
  await take(f.redis, 'k', 2, 60_000, 0);
  await take(f.redis, 'k', 2, 60_000, 0);
  f.clock.now = 10;
  for (let i = 0; i < 3; i++) {
    const r = await take(f.redis, 'k', 2, 60_000, 10);
    assert.deepEqual(r, { ok: false, remaining: 0, resetAt: 60_000 });
  }
  assert.equal(f.value('k'), 2);
});

test('the window resets once the key expires', async () => {
  const f = fakeRedis({ now: 0 });
  await take(f.redis, 'k', 1, 1000, 0);
  assert.equal((await take(f.redis, 'k', 1, 1000, 500)).ok, false);
  f.clock.now = 1000;
  assert.deepEqual(await take(f.redis, 'k', 1, 1000, 1000), { ok: true, remaining: 0, resetAt: 2000 });
});

test('peek reports the same counter and never increments', async () => {
  const f = fakeRedis({ now: 0 });
  assert.deepEqual(await peek(f.redis, 'k', 2, 0), { ok: true, remaining: 2, resetAt: 0 });
  await take(f.redis, 'k', 2, 60_000, 0);
  f.clock.now = 5000;
  assert.deepEqual(await peek(f.redis, 'k', 2, 5000), { ok: true, remaining: 1, resetAt: 60_000 });
  await take(f.redis, 'k', 2, 60_000, 5000);
  assert.deepEqual(await peek(f.redis, 'k', 2, 5000), { ok: false, remaining: 0, resetAt: 60_000 });
  assert.equal(f.value('k'), 2);
});

test('createLimits uses namespaced keys and agrees between hit and blocked', async () => {
  const f = fakeRedis({ now: 0 });
  const l = createLimits('interview-coach', () => f.redis, undefined, () => f.clock.now);
  assert.equal(await l.blocked('session', '1.2.3.4', lim), null);
  assert.deepEqual(await l.hit('session', '1.2.3.4', lim), { ok: true, remaining: 1, resetAt: 60_000 });
  assert.equal(f.value('rl:interview-coach:session:1.2.3.4'), 1);
  await l.hit('session', '1.2.3.4', lim);
  f.clock.now = 30_000;
  const over = await l.hit('session', '1.2.3.4', lim);
  assert.deepEqual(over, { ok: false, retryAfter: 30, resetAt: 60_000 });
  assert.deepEqual(await l.blocked('session', '1.2.3.4', lim), over);
  assert.equal(f.value('rl:interview-coach:session:1.2.3.4'), 2);
});

test('a failing Redis fails closed with a 503', async () => {
  const f = fakeRedis();
  f.fail();
  const l = createLimits('interview-coach', () => f.redis);
  const v = await l.hit('session', '1.2.3.4', lim);
  assert.equal(v.ok, false);
  assert.ok(!v.ok && v.busy);
  assert.ok(!v.ok && (await l.blocked('session', '1.2.3.4', lim))?.busy);
  if (!v.ok) assert.equal(tooMany(v, 'x').status, 503);
  const b = createBudget('interview-coach', 'sessions', 5, () => f.redis);
  assert.deepEqual(await b.take(), { ok: false, busy: true });
});

test('without Redis the in-memory limiter is used', async () => {
  let now = 0;
  const l = createLimits('interview-coach', () => null, undefined, () => now);
  assert.equal((await l.hit('turn', 'a', lim)).ok, true);
  assert.equal((await l.hit('turn', 'a', lim)).ok, true);
  now = 10;
  const v = await l.hit('turn', 'a', lim);
  assert.ok(!v.ok && v.retryAfter === 60 && v.resetAt === 60_000);
  assert.ok(await l.blocked('turn', 'a', lim));
});

test('daily session budget is one global counter per UTC day', async () => {
  const f = fakeRedis({ now: Date.parse('2026-10-03T23:59:00Z') });
  const clock = () => f.clock.now;
  const one = createBudget('interview-coach', 'sessions', 2, () => f.redis, clock);
  const two = createBudget('interview-coach', 'sessions', 2, () => f.redis, clock);
  assert.deepEqual(await one.take(), { ok: true });
  assert.deepEqual(await two.take(), { ok: true });
  assert.deepEqual(await one.take(), { ok: false, busy: false });
  assert.equal(f.value('budget:interview-coach:sessions:2026-10-03'), 2);
  assert.equal(f.ttl('budget:interview-coach:sessions:2026-10-03'), 2 * 24 * 3600 * 1000);
  f.clock.now = Date.parse('2026-10-04T00:00:01Z');
  assert.deepEqual(await two.take(), { ok: true });
});
