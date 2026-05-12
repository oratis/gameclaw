/**
 * Tiny in-memory per-IP rate limiter for low-volume public endpoints.
 *
 * Cloud Run scales to multiple instances, so this is NOT a global rate
 * limit — it's a per-instance soft cap that catches obvious spam but won't
 * stop a determined attacker. For real rate limiting use Cloud Armor or
 * an external store like Redis.
 *
 * Sliding window: each IP gets `limit` requests per `windowMs`.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export interface RateLimitOptions {
  /** Bucket key (typically request IP). */
  key: string;
  /** Max requests in the window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

export function checkRateLimit(opts: RateLimitOptions): {
  ok: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    // Naive GC: drop expired entries when the map grows too large.
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(opts.key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(opts.key, fresh);
    return { ok: true, remaining: opts.limit - 1, resetAt: fresh.resetAt };
  }

  if (bucket.count >= opts.limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return {
    ok: true,
    remaining: opts.limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/** Extract client IP from common proxy headers, falling back to "unknown". */
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
