/* global URL, Buffer */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// T7: one retry rule; the API client and React Query never both retry the
// same failure.
const source = readFileSync(new URL('./retryPolicy.logic.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  parseRetryAfterMs, backoffDelayMs, rateLimitRetryDelayMs, isRetryableQueryError, shouldRetryQuery,
  retryQueryAtMost, RATE_LIMIT_MAX_ATTEMPTS, RETRY_MAX_DELAY_MS,
} = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

const NOW = Date.parse('2026-10-17T10:00:00Z');
const http = (status) => ({ isAxiosError: true, response: { status } });

test('Retry-After is read as seconds or as an HTTP date', () => {
  assert.equal(parseRetryAfterMs('3', NOW), 3_000);
  assert.equal(parseRetryAfterMs(2, NOW), 2_000);
  assert.equal(parseRetryAfterMs('1.5', NOW), 1_500);
  assert.equal(parseRetryAfterMs('Sat, 17 Oct 2026 10:00:05 GMT', NOW), 5_000);
  assert.equal(parseRetryAfterMs('Sat, 17 Oct 2026 09:59:00 GMT', NOW), 0, 'a past date means now');
  for (const bad of [undefined, null, '', 'soon', '-3', {}]) assert.equal(parseRetryAfterMs(bad, NOW), null);
});

test('backoff uses full jitter under an exponential, capped ceiling', () => {
  assert.equal(backoffDelayMs(0, () => 0), 0);
  assert.equal(backoffDelayMs(0, () => 0.999), 999);
  assert.equal(backoffDelayMs(2, () => 0.5), 2_000);
  assert.equal(backoffDelayMs(10, () => 0.999), 9_990, 'never above the cap');
  assert.ok(backoffDelayMs(30, () => 0.9999) < RETRY_MAX_DELAY_MS);
});

test('a 429 is retried at most twice, waiting what the server asked', () => {
  assert.equal(RATE_LIMIT_MAX_ATTEMPTS, 3);
  assert.equal(rateLimitRetryDelayMs(0, '2', NOW, () => 0), 2_000);
  const spread = rateLimitRetryDelayMs(0, '2', NOW, () => 0.999);
  assert.ok(spread >= 2_000 && spread <= 2_401, 'at least Retry-After, a little spread');
  assert.equal(rateLimitRetryDelayMs(1, undefined, NOW, () => 0.5), 1_000, 'no Retry-After: backoff');
  assert.equal(rateLimitRetryDelayMs(2, '1', NOW, () => 0), null, 'third attempt was the last');
  assert.equal(rateLimitRetryDelayMs(0, '900', NOW, () => 0), null, 'a long wait is not retried (sign-in limit)');
  assert.equal(rateLimitRetryDelayMs(0, String(RETRY_MAX_DELAY_MS / 1000), NOW, () => 0.999), RETRY_MAX_DELAY_MS);
});

test('queries retry only after no answer, 408, 5xx or a dropped session refresh', () => {
  for (const error of [{ isAxiosError: true, code: 'ERR_NETWORK' }, new TypeError('Failed to fetch'), http(408), http(500), http(503),
    { ...http(401), transientAuthFailure: true }]) {
    assert.equal(isRetryableQueryError(error), true, JSON.stringify(error));
  }
  for (const error of [http(400), http(401), http(403), http(404), http(409), http(422), http(429), null, undefined, 'boom']) {
    assert.equal(isRetryableQueryError(error), false, JSON.stringify(error));
  }
});

test('at most two query retries; per-query limits use the same rule', () => {
  assert.equal(shouldRetryQuery(0, http(502)), true);
  assert.equal(shouldRetryQuery(1, http(502)), true);
  assert.equal(shouldRetryQuery(2, http(502)), false);
  assert.equal(shouldRetryQuery(0, http(404)), false);
  const once = retryQueryAtMost(1);
  assert.equal(once(0, http(500)), true);
  assert.equal(once(1, http(500)), false);
  assert.equal(once(0, http(404)), false);
});

test('a request answered 429 costs at most 3 attempts in total (client only, React Query adds none)', () => {
  let attempts = 1;
  while (rateLimitRetryDelayMs(attempts - 1, undefined, NOW, () => 0) !== null) attempts += 1;
  assert.equal(attempts, 3);
  assert.equal(shouldRetryQuery(0, http(429)), false);
});
