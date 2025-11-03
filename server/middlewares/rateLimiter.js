// Simple in-memory rate limiter middleware for Express
// Note: Per-process only. For multi-instance deployments, use a shared store (e.g., Redis).

const buckets = new Map(); // key -> { count, resetAt }

function defaultKeyGenerator(req) {
  const ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "unknown";
  return Array.isArray(ip) ? ip[0] : String(ip);
}

export function createRateLimiter({
  windowMs = 60_000,
  max = 60,
  keyGenerator = defaultKeyGenerator,
  message = "Too many requests. Please try again later.",
  statusCode = 429,
  prefix = "rl",
} = {}) {
  return function rateLimiter(req, res, next) {
    try {
      const now = Date.now();
      const keyRoot = keyGenerator(req);
      const key = `${prefix}:${keyRoot}`;

      let entry = buckets.get(key);
      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        buckets.set(key, entry);
      }

      entry.count += 1;
      const remaining = Math.max(0, max - entry.count);
      const resetSec = Math.ceil((entry.resetAt - now) / 1000);

      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, remaining)));
      res.setHeader("RateLimit-Reset", String(resetSec));

      if (entry.count > max) {
        res.setHeader("Retry-After", String(resetSec));
        return res.status(statusCode).json({ error: message });
      }

      return next();
    } catch (e) {
      return next();
    }
  };
}

// Optional cleanup to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();
