// frontend/lib/rateLimiter.ts
// Simple in‑process token‑bucket rate limiter for Next.js API routes
// Instance‑local; best‑effort only (serverless environments).

type RateLimitConfig = {
  points: number; // number of requests
  duration: number; // per duration in seconds
};

// Default configurations per route (as per user decision)
export const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  login: { points: 5, duration: 60 }, // per IP key
  chat: { points: 30, duration: 60 }, // per userId
  "report-analyzer": { points: 10, duration: 600 }, // per userId per 10 min
  "health-profile": { points: 60, duration: 60 },
  "health-timeline": { points: 60, duration: 60 },
  appointments: { points: 30, duration: 60 },
};

interface Bucket {
  tokens: number;
  lastRefill: number; // epoch ms
}

const buckets = new Map<string, Bucket>();

function getKey(route: string, identifier: string): string {
  return `${route}:${identifier}`;
}

export function rateLimit(
  route: string,
  identifier: string,
  config?: RateLimitConfig,
): { allowed: boolean; remaining: number; resetMs: number } {
  const limit = config ?? DEFAULT_LIMITS[route];
  if (!limit) {
    // No rate limit defined for this route – allow.
    return { allowed: true, remaining: Infinity, resetMs: 0 };
  }
  const key = getKey(route, identifier);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: limit.points, lastRefill: now };
    buckets.set(key, bucket);
  }
  // Refill tokens based on elapsed time
  const elapsedSec = (now - bucket.lastRefill) / 1000;
  const refillTokens = Math.floor(elapsedSec * (limit.points / limit.duration));
  if (refillTokens > 0) {
    bucket.tokens = Math.min(limit.points, bucket.tokens + refillTokens);
    bucket.lastRefill = now;
  }
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetMs: bucket.lastRefill + limit.duration * 1000 - now,
    };
  }
  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetMs: bucket.lastRefill + limit.duration * 1000 - now,
  };
}

// Helper to wrap a Next.js handler
export function withRateLimit(
  route: string,
  identifierFn: (request: Request) => string,
  handler: (request: Request) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    const id = identifierFn(request);
    const result = rateLimit(route, id);
    if (!result.allowed) {
      return new Response(
        JSON.stringify({ error: "TOO_MANY_REQUESTS", message: "Rate limit exceeded" }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
    // Optionally set rate‑limit headers
    const response = await handler(request);
    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Limit", String(DEFAULT_LIMITS[route]?.points ?? ""));
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetMs / 1000)));
    return new Response(response.body, { ...response, headers });
  };
}
