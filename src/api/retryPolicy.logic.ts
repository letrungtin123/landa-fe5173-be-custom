// ============================================================
// Retry policy — one rule for the API client and React Query
//
// - 429 (rate limited): only the API client retries, honoring Retry-After
//   (seconds or HTTP date), else exponential backoff with full jitter; at
//   most RATE_LIMIT_MAX_ATTEMPTS attempts, never a wait over
//   RETRY_MAX_DELAY_MS (a longer Retry-After is not retried at all).
// - React Query retries a query at most QUERY_MAX_RETRIES times, only after
//   no answer (network, timeout), 408 or 5xx, with full-jitter backoff; never
//   after another 4xx and never after a 429 (already retried by the client).
// - Mutations are not retried automatically (QueryClient default).
// No imports: tested with node --test.
// ============================================================

/** Attempts of one request answered 429, the first one included. */
export const RATE_LIMIT_MAX_ATTEMPTS = 3;
/** Retries of a query after a network error, a timeout, 408 or 5xx. */
export const QUERY_MAX_RETRIES = 2;
export const RETRY_BASE_DELAY_MS = 1_000;
/** Longest wait before any retry. */
export const RETRY_MAX_DELAY_MS = 10_000;

/** Retry-After as milliseconds from now: delta-seconds or an HTTP date; null when absent or invalid. */
export function parseRetryAfterMs(value: unknown, now: number = Date.now()): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * 1000);
  // An HTTP date names the day and the month ("Sat, 17 Oct 2026 10:00:05 GMT").
  if (!/[a-z]/i.test(text)) return null;
  const at = Date.parse(text);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, at - now);
}

/** Full jitter: a random wait in [0, min(max, base · 2^attempt)). */
export function backoffDelayMs(attempt: number, random: () => number = Math.random): number {
  const ceiling = Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt));
  return Math.floor(random() * ceiling);
}

/**
 * Wait before retrying a request answered 429, or null when it must not be
 * retried. `retriesSoFar` counts the earlier retries of the same request.
 */
export function rateLimitRetryDelayMs(
  retriesSoFar: number,
  retryAfter: unknown,
  now: number = Date.now(),
  random: () => number = Math.random,
): number | null {
  if (retriesSoFar >= RATE_LIMIT_MAX_ATTEMPTS - 1) return null;
  const asked = parseRetryAfterMs(retryAfter, now);
  if (asked === null) return backoffDelayMs(retriesSoFar, random);
  if (asked > RETRY_MAX_DELAY_MS) return null;
  // At least what the server asked, spread a little so tabs do not come back together.
  const spread = Math.floor(random() * Math.min(1_000, asked * 0.2 + 1));
  return Math.min(RETRY_MAX_DELAY_MS, asked + spread);
}

type RequestError = {
  response?: { status?: unknown };
  /** Set by the API client: the session was kept after a refresh that got no answer. */
  transientAuthFailure?: unknown;
};

/** A query error worth another try: no answer at all, 408, 5xx, or a dropped session refresh. */
export function isRetryableQueryError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const failure = error as RequestError;
  if (failure.transientAuthFailure === true) return true;
  const status = failure.response?.status;
  if (typeof status !== "number") return true;
  if (status === 429) return false;
  return status === 408 || status >= 500;
}

/** React Query `retry` with at most `maxRetries` retries. */
export function retryQueryAtMost(maxRetries: number) {
  return (failureCount: number, error: unknown): boolean => failureCount < maxRetries && isRetryableQueryError(error);
}

export const shouldRetryQuery = retryQueryAtMost(QUERY_MAX_RETRIES);

/** React Query `retryDelay`. */
export function queryRetryDelayMs(failureCount: number): number {
  return backoffDelayMs(failureCount);
}
