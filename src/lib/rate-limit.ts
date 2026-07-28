/**
 * Fixed-window rate limiter backed by an in-process Map.
 *
 * This is deliberately dependency-free so the app runs anywhere out of the box.
 * It is correct for a single instance; for a multi-region deployment swap the
 * `store` for Redis/Upstash — the `check()` signature is designed so that is a
 * drop-in change with no call-site edits.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Prevents unbounded growth from one-off keys (e.g. per-IP login attempts). */
const MAX_KEYS = 10_000;

function sweep(now: number) {
  if (store.size < MAX_KEYS) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  /** Seconds until the window resets — surfaced in the error message. */
  retryAfter: number;
};

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt,
      retryAfter: 0,
    };
  }

  existing.count += 1;
  const success = existing.count <= limit;

  return {
    success,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfter: success ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Clears a bucket early — used after a successful login. */
export function resetRateLimit(key: string) {
  store.delete(key);
}

/** Tuned presets. Auth is strict; reads are generous. */
export const RATE_LIMITS = {
  auth: { limit: 8, windowMs: 60_000 },
  register: { limit: 4, windowMs: 60 * 60_000 },
  mutation: { limit: 60, windowMs: 60_000 },
  upload: { limit: 30, windowMs: 60_000 },
  publicForm: { limit: 6, windowMs: 60_000 },
  export: { limit: 10, windowMs: 60_000 },
} as const;
