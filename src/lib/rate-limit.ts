import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Route-specific rate limiters using Upstash Redis.
 *
 * Limits are per-IP using a sliding window algorithm.
 * Stripe webhooks are intentionally excluded — blocking them would
 * cause subscription updates to fail silently.
 *
 * Limits chosen to be generous for real users but painful for abuse:
 *   - checkout / billing-portal: 5/hr  (financial actions, Stripe cost)
 *   - listing-import:            15/hr (fetches external URLs)
 *   - properties POST:           30/15 min (active power user = ~2/min)
 *   - properties GET:            60/5 min  (reads are cheap)
 *   - comps / neighborhood / deal-matches GET: 20/5 min (external-data reads, consistent tier)
 *   - general (all others):      20/5 min
 */

function buildRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// Lazy singleton — created once on first call, safe for Edge runtime
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) _redis = buildRedis();
  return _redis;
}

// --------------------------------------------------------------------------
// Named limiters — one per sensitivity tier
// --------------------------------------------------------------------------

function checkout() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, "60 m"),
    prefix: "rl:checkout",
    analytics: true,
  });
}

function billingPortal() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, "60 m"),
    prefix: "rl:billing",
    analytics: true,
  });
}

function listingImport() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(15, "60 m"),
    prefix: "rl:import",
    analytics: true,
  });
}

function propertiesMutate() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, "15 m"),
    prefix: "rl:prop:w",
    analytics: true,
  });
}

function propertiesRead() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(60, "5 m"),
    prefix: "rl:prop:r",
    analytics: true,
  });
}

function actualsRead() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(60, "5 m"),
    prefix: "rl:act:r",
    analytics: true,
  });
}

function actualsMutate() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, "15 m"),
    prefix: "rl:act:w",
    analytics: true,
  });
}

function compsRead() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, "5 m"),
    prefix: "rl:comps",
    analytics: true,
  });
}

function neighborhoodRead() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, "5 m"),
    prefix: "rl:neighborhood",
    analytics: true,
  });
}

function dealMatchesRead() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, "5 m"),
    prefix: "rl:deals:r",
    analytics: true,
  });
}

function dealMatchesMutate() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, "15 m"),
    prefix: "rl:deals:w",
    analytics: true,
  });
}

function general() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, "5 m"),
    prefix: "rl:general",
    analytics: true,
  });
}

function profileRead() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, "5 m"),
    prefix: "rl:profile:r",
    analytics: true,
  });
}

function profileMutate() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, "15 m"),
    prefix: "rl:profile:w",
    analytics: true,
  });
}

function accountDelete() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(3, "60 m"),
    prefix: "rl:account:del",
    analytics: true,
  });
}

/** Account deletion keyed on user ID — 1 attempt per 24 hours per user.
 *  Layered on top of the IP-keyed limit to prevent bypass via proxy rotation. */
function accountDeleteByUser() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(1, "24 h"),
    prefix: "rl:account:del:user",
    analytics: true,
  });
}

function feedbackSubmitFn() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "rl:feedback",
    analytics: true,
  });
}

// Cache limiter instances after first use (module-level cache)
const _cache: Partial<Record<string, Ratelimit>> = {};

function cached(key: string, factory: () => Ratelimit): Ratelimit {
  if (!_cache[key]) _cache[key] = factory();
  return _cache[key]!;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Returns the appropriate Ratelimit instance for a given route.
 * Used in Next.js middleware.
 */
export function resolveRateLimiter(pathname: string, method: string): Ratelimit {
  if (pathname === "/api/checkout") return cached("checkout", checkout);
  if (pathname === "/api/billing-portal") return cached("billing", billingPortal);
  if (pathname === "/api/listing-import") return cached("import", listingImport);
  if (pathname === "/api/comps") return cached("comps", compsRead);
  if (pathname === "/api/neighborhood") return cached("neighborhood", neighborhoodRead);

  if (pathname === "/api/deal-matches") {
    return method === "GET"
      ? cached("deals:r", dealMatchesRead)
      : cached("deals:w", dealMatchesMutate);
  }

  if (pathname === "/api/properties/[id]/actuals") {
    return method === "GET"
      ? cached("act:r", actualsRead)
      : cached("act:w", actualsMutate);
  }

  if (pathname.startsWith("/api/properties")) {
    return method === "GET"
      ? cached("prop:r", propertiesRead)
      : cached("prop:w", propertiesMutate);
  }

  if (pathname === "/api/profile") {
    return method === "GET"
      ? cached("profile:r", profileRead)
      : cached("profile:w", profileMutate);
  }

  if (pathname === "/api/account/delete") {
    return cached("account:del", accountDelete);
  }

  return cached("general", general);
}

export function getAccountDeleteByUserLimiter(): Ratelimit {
  return cached("account:del:user", accountDeleteByUser);
}

export function feedbackSubmit(): Ratelimit {
  return cached("feedback", feedbackSubmitFn);
}

/**
 * Extract the real client IP from the request headers.
 *
 * Priority:
 *  1. x-real-ip  — set by Vercel's edge network; not client-controlled
 *  2. x-forwarded-for (rightmost entry) — proxy-appended, harder to spoof
 *     than the leftmost entry which is client-provided and trivially forged
 *  3. 127.0.0.1  — local dev fallback
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",");
    return ips[ips.length - 1].trim();
  }

  return "127.0.0.1";
}

/**
 * Returns true when Upstash is configured (both env vars are present).
 * Used in route handlers to skip rate limiting in environments without Redis
 * (e.g. CI, local dev without Upstash).
 *
 * Warns in production when env vars are absent so operators know rate limiting
 * is silently disabled.
 */
export function isRateLimitingEnabled(): boolean {
  const enabled = !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (!enabled && process.env.NODE_ENV === "production") {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set. " +
        "Rate limiting is DISABLED in production."
    );
  }

  return enabled;
}
