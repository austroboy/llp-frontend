/**
 * Rate limiting — Upstash Redis with in-memory fallback.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

// ── Upstash Redis rate limiters (cached by RPM) ──

const _ratelimitCache = new Map<number, Ratelimit>();

function getRatelimit(rpm: number = 20): Ratelimit | null {
  if (_ratelimitCache.has(rpm)) return _ratelimitCache.get(rpm)!;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  try {
    const rl = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(rpm, "60 s"),
      prefix: `rl:${rpm}`,
    });
    _ratelimitCache.set(rpm, rl);
    return rl;
  } catch (err) {
    console.error("[RateLimit] Failed to initialize Redis:", err);
    return null;
  }
}

// ── In-memory fallback (when Upstash not configured) ──

const _memoryStore = new Map<string, { count: number; resetAt: number }>();

function checkMemoryLimit(key: string, rpm: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = _memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    _memoryStore.set(key, { count: 1, resetAt: now + 60000 });
    return { allowed: true, remaining: rpm - 1 };
  }

  if (entry.count >= rpm) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: rpm - entry.count };
}

// Clean stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  _memoryStore.forEach((entry, key) => {
    if (now > entry.resetAt) _memoryStore.delete(key);
  });
}, 300000);

// ── Public API ──

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit for a user/IP. Used by existing chat routes.
 */
export async function checkRateLimit(userId: string, rpm: number = 20): Promise<RateLimitResult> {
  const rl = getRatelimit(rpm);

  if (rl) {
    try {
      const { success, remaining, reset } = await rl.limit(userId);
      return { allowed: success, remaining, resetMs: reset };
    } catch (err) {
      console.error("[RateLimit] Check failed:", err);
      return { allowed: true, remaining: 20, resetMs: 0 };
    }
  }

  // Fallback to memory
  const { allowed, remaining } = checkMemoryLimit(`rl:${rpm}:${userId}`, rpm);
  return { allowed, remaining, resetMs: 0 };
}

/**
 * Drop-in rate limit guard for API route handlers.
 * Returns a NextResponse 429 if limit exceeded, or null if allowed.
 *
 * Usage in any route.ts:
 *   const blocked = await rateGuard(request, 10); // 10 RPM
 *   if (blocked) return blocked;
 */
export async function rateGuard(
  request: NextRequest,
  rpm: number = 10
): Promise<NextResponse | null> {
  let key: string;

  try {
    const { userId } = await auth();
    key = userId || request.headers.get("x-forwarded-for") || "anon";
  } catch {
    key = request.headers.get("x-forwarded-for") || "anon";
  }

  const { allowed, remaining } = await checkRateLimit(key, rpm);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(rpm),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null; // Allowed
}
