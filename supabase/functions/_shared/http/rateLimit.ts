/**
 * Simple in-memory per-IP rate limiter for edge functions.
 * Limits are per-isolate (reset on cold start), which is acceptable
 * for basic abuse prevention on public endpoints.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Returns null if the request is within limits, or a 429 Response if rate-limited.
 * @param ip        Client IP address
 * @param maxHits   Max requests per window (default 30)
 * @param windowMs  Window duration in ms (default 60 000 = 1 min)
 * @param headers   CORS headers to include in the 429 response
 */
export function checkRateLimit(
  ip: string,
  headers: Record<string, string>,
  maxHits = 30,
  windowMs = 60_000,
): Response | null {
  cleanup();
  const now = Date.now();
  let entry = buckets.get(ip);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 1, resetAt: now + windowMs };
    buckets.set(ip, entry);
    return null;
  }

  entry.count++;
  if (entry.count > maxHits) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again shortly." }),
      {
        status: 429,
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  return null;
}
