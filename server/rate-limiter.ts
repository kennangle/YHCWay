import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked: boolean;
  blockedUntil?: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  message?: string;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.limits.entries());
    for (const [key, entry] of entries) {
      if (entry.resetAt < now && (!entry.blocked || (entry.blockedUntil && entry.blockedUntil < now))) {
        this.limits.delete(key);
      }
    }
  }

  check(key: string, options: RateLimiterOptions): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let entry = this.limits.get(key);

    if (entry && entry.blocked && entry.blockedUntil && entry.blockedUntil > now) {
      return { allowed: false, remaining: 0, resetAt: entry.blockedUntil };
    }

    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + options.windowMs,
        blocked: false,
      };
      this.limits.set(key, entry);
    }

    entry.count++;

    if (entry.count > options.maxRequests) {
      if (options.blockDurationMs) {
        entry.blocked = true;
        entry.blockedUntil = now + options.blockDurationMs;
      }
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    return {
      allowed: true,
      remaining: options.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  reset(key: string): void {
    this.limits.delete(key);
  }
}

const globalRateLimiter = new RateLimiter();

export function createRateLimiter(options: RateLimiterOptions) {
  const defaultKeyGenerator = (req: Request) => {
    const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
    return userId || req.ip || "anonymous";
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const key = (options.keyGenerator || defaultKeyGenerator)(req);
    const result = globalRateLimiter.check(key, options);

    res.setHeader("X-RateLimit-Limit", options.maxRequests);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      res.status(429).json({
        error: options.message || "Too many requests, please try again later",
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
}

export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  blockDurationMs: 30 * 60 * 1000,
  keyGenerator: (req) => `login:${req.body?.email || req.ip}`,
  message: "Too many login attempts. Please try again in 30 minutes.",
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: "API rate limit exceeded. Please slow down.",
});

export const gmailLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Gmail API rate limit reached. Please wait before making more requests.",
});

export const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  keyGenerator: (req) => `signup:${req.ip}`,
  message: "Too many signup attempts. Please try again later.",
});

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryCondition = (error) => {
      const status = error?.response?.status || error?.status;
      return status === 429 || status === 503 || status === 502;
    },
  } = options;

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      const retryAfter = error?.response?.headers?.["retry-after"];
      if (retryAfter) {
        delay = parseInt(retryAfter) * 1000;
      }

      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

export function resetLoginAttempts(email: string, ip?: string): void {
  globalRateLimiter.reset(`login:${email}`);
  if (ip) {
    globalRateLimiter.reset(`login:${ip}`);
  }
}

export { globalRateLimiter };
