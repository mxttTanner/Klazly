import "server-only";

/**
 * Best-effort rate limiting for unauthenticated, abuse-prone endpoints
 * (login, phone→email resolution, password reset). Two backends:
 *
 *   1. Upstash Redis (durable, correct across serverless instances) —
 *      used automatically when UPSTASH_REDIS_REST_URL +
 *      UPSTASH_REDIS_REST_TOKEN are set. Add the "Upstash for Redis"
 *      integration on the Vercel Marketplace to activate it (env vars
 *      are injected for you). This is the real fix.
 *
 *   2. In-memory fallback (per-instance only) — a fixed-window counter
 *      kept in module scope. On serverless this only throttles bursts
 *      that land on the same warm instance, so it is genuinely
 *      best-effort. It still blunts a naive single-connection
 *      brute-force / reset-bomb and never blocks legitimate traffic.
 *
 * We deliberately fail OPEN: any backend error allows the request. A
 * rate limiter must never lock the whole product out on a Redis blip.
 */

type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// ---- In-memory fixed-window store (fallback) ----
const memStore = new Map<string, { count: number; resetAt: number }>();

function memLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now >= entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true };
  }
  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return { allowed: true };
}

// Opportunistic cleanup so the map can't grow unbounded on a long-lived
// warm instance. Cheap: only scans when the map gets sizeable.
function maybeSweep() {
  if (memStore.size < 5000) return;
  const now = Date.now();
  memStore.forEach((v, k) => {
    if (now >= v.resetAt) memStore.delete(k);
  });
}

// ---- Upstash fixed-window via REST (no SDK dependency) ----
async function upstashLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  // Pipeline INCR + (conditional) EXPIRE. First hit in a window sets the
  // TTL; subsequent hits just increment. Fail open on any error.
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec), "NX"],
    ]),
    cache: "no-store",
  });
  if (!res.ok) return { allowed: true };
  const parsed = (await res.json()) as Array<{ result: number }>;
  const count = parsed?.[0]?.result ?? 0;
  if (count > limit) {
    return { allowed: false, retryAfterSeconds: windowSec };
  }
  return { allowed: true };
}

/**
 * Consume one token for `identifier` in bucket `name`. Returns whether
 * the request is allowed. Example: rateLimit("login", ip, 10, 60) →
 * 10 attempts per 60s per IP.
 */
export async function rateLimit(
  name: string,
  identifier: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const key = `rl:${name}:${identifier}`;
  try {
    if (hasUpstash) return await upstashLimit(key, limit, windowSec);
    maybeSweep();
    return memLimit(key, limit, windowSec);
  } catch {
    return { allowed: true };
  }
}

/**
 * Best-effort client IP from the request headers Vercel sets. Falls back
 * to a constant so the limiter still buckets *something* locally.
 */
export function clientIpFrom(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
