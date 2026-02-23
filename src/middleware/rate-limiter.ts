import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (use Redis for multi-instance)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute for authenticated
};

const authConfig: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 10, // 10 requests per minute for auth endpoints
};

function getRateLimitKey(req: NextRequest, identifier?: string): string {
  // Use user ID if authenticated, otherwise IP
  if (identifier) {
    return `rate:${identifier}`;
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
              req.headers.get('x-real-ip') || 
              'unknown';
  return `rate:${ip}`;
}

export function rateLimiter(config: RateLimitConfig = defaultConfig) {
  return (req: NextRequest): NextResponse | null => {
    const key = getRateLimitKey(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // New window
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);

      // Add rate limit headers
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', (config.maxRequests - 1).toString());
      response.headers.set('X-RateLimit-Reset', entry.resetTime.toString());
      return null;
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
          }
        }
      );
    }

    // Add headers to successful request
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString());
    return null;
  };
}

// Pre-configured rate limiters
export const standardRateLimiter = rateLimiter(defaultConfig);
export const authRateLimiter = rateLimiter(authConfig);
