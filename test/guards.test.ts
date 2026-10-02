import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCapped, readJson } from '../app/server/http.ts';
import { clientIp, createDailyBudget, createLimiter, envInt, normalizeIp } from '../app/server/ratelimit.ts';
import { callIdFrom } from '../app/server/calls.ts';

function streamOf(chunks: number, size: number, onPull?: () => void) {
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(c) {
      onPull?.();
      if (sent++ >= chunks) return c.close();
      c.enqueue(new Uint8Array(size).fill(97));
    },
  });
}

function streamed(body: ReadableStream<Uint8Array>, headers: Record<string, string> = {}) {
  return new Request('http://x/api', { method: 'POST', body, headers, duplex: 'half' } as RequestInit);
}

test('readCapped stops a chunked body without content-length once it passes the cap', async () => {
  let pulls = 0;
  const res = await readCapped(streamed(streamOf(10_000, 1024, () => pulls++)), 4096);
  assert.deepEqual(res, { ok: false, reason: 'too_large' });
  assert.ok(pulls < 20, `read ${pulls} chunks, expected to stop early`);
});

test('readCapped ignores a content-length that understates the body', async () => {
  const res = await readCapped(streamed(streamOf(10, 1024), { 'content-length': '10' }), 4096);
  assert.equal(res.ok, false);
});

test('readCapped rejects a declared length over the cap before reading', async () => {
  let pulls = 0;
  const res = await readCapped(streamed(streamOf(10, 1024, () => pulls++), { 'content-length': '999999' }), 4096);
  assert.equal(res.ok, false);
  assert.equal(pulls <= 1, true);
});

test('readCapped returns the whole body under the cap', async () => {
  const res = await readCapped(streamed(streamOf(3, 1000)), 4096);
  assert.ok(res.ok && res.bytes.byteLength === 3000);
});

test('readJson maps oversize to 413 and parses small bodies', async () => {
  const big = await readJson(new Request('http://x', { method: 'POST', body: 'x'.repeat(5000) }), 4096);
  assert.ok(!big.ok && big.res.status === 413);
  const ok = await readJson(new Request('http://x', { method: 'POST', body: '{"a":1}' }), 4096);
  assert.deepEqual(ok, { ok: true, body: { a: 1 } });
  // Multibyte characters count as bytes, not string length.
  const wide = await readJson(new Request('http://x', { method: 'POST', body: JSON.stringify('é'.repeat(3000)) }), 4096);
  assert.ok(!wide.ok && wide.res.status === 413);
});

test('normalizeIp canonicalizes and groups IPv6 by /64', () => {
  assert.equal(normalizeIp(' 203.0.113.7 '), '203.0.113.7');
  assert.equal(normalizeIp('203.0.113.7:5555'), '203.0.113.7');
  assert.equal(normalizeIp('::ffff:203.0.113.7'), '203.0.113.7');
  assert.equal(normalizeIp('2001:db8:1:2:aaaa::1'), normalizeIp('2001:0db8:0001:0002:ffff:ffff:ffff:ffff'));
  assert.equal(normalizeIp('[2001:db8:1:2::9]:443'), '2001:db8:1:2::/64');
  assert.notEqual(normalizeIp('2001:db8:1:2::1'), normalizeIp('2001:db8:1:3::1'));
  assert.equal(normalizeIp('not-an-ip'), 'invalid');
  assert.equal(normalizeIp('random-123'), normalizeIp('random-456'));
  assert.equal(normalizeIp('999.1.1.1'), 'invalid');
});

test('clientIp prefers x-real-ip, then the last x-forwarded-for hop', () => {
  const h = (headers: Record<string, string>) => new Request('http://x', { headers });
  assert.equal(clientIp(h({ 'x-real-ip': '198.51.100.1', 'x-forwarded-for': '1.1.1.1' })), '198.51.100.1');
  assert.equal(clientIp(h({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 198.51.100.2' })), '198.51.100.2');
  assert.equal(clientIp(h({})), 'unknown');
});

test('limiter blocks at the limit and recovers after the window', () => {
  const l = createLimiter();
  const lim = { limit: 2, windowMs: 1000 };
  assert.equal(l.hit('a', lim, 0).ok, true);
  assert.equal(l.hit('a', lim, 10).ok, true);
  const third = l.hit('a', lim, 20);
  assert.ok(!third.ok && third.retryAfter === 1);
  assert.equal(l.blocked('a', lim, 20), 1);
  assert.equal(l.hit('a', lim, 1001).ok, true);
});

test('filling the key map does not reset counters for an active key', () => {
  const l = createLimiter(100);
  const lim = { limit: 1, windowMs: 60_000 };
  assert.equal(l.hit('attacker', lim, 0).ok, true);
  assert.equal(l.hit('attacker', lim, 1).ok, false);
  for (let i = 0; i < 99; i++) l.hit(`k${i}`, lim, 2);
  // The attacker key was touched most recently before the flood, so it is still tracked.
  l.hit('attacker', lim, 3);
  for (let i = 99; i < 150; i++) l.hit(`k${i}`, lim, 4);
  assert.ok(l.size() <= 100);
  assert.ok(l.blocked('attacker', lim, 5) > 0);
  assert.equal(l.hit('k149', lim, 5).ok, false);
});

test('envInt falls back on malformed values instead of disabling limits', () => {
  assert.equal(envInt(undefined, 3), 3);
  assert.equal(envInt('abc', 3), 3);
  assert.equal(envInt('', 3), 3);
  assert.equal(envInt('-1', 3), 3);
  assert.equal(envInt('2.5', 3), 3);
  assert.equal(envInt('0', 3), 0);
  assert.equal(envInt('10', 3), 10);
});

test('daily budget stops at the limit and resets on a new UTC day', () => {
  let day = '2026-10-01';
  const b = createDailyBudget(2, () => day);
  assert.equal(b.take(), true);
  assert.equal(b.take(), true);
  assert.equal(b.take(), false);
  day = '2026-10-02';
  assert.equal(b.take(), true);
});

test('callIdFrom reads the id from the Location header', () => {
  assert.equal(callIdFrom('/v1/realtime/calls/rtc_abc123'), 'rtc_abc123');
  assert.equal(callIdFrom('https://api.openai.com/v1/realtime/calls/rtc_x?y=1'), 'rtc_x');
  assert.equal(callIdFrom(null), null);
  assert.equal(callIdFrom('/v1/realtime/calls/../../x y'), null);
});
