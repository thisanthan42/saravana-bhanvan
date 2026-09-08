/**
 * Lightweight sliding-window in-memory rate limiter middleware.
 * Protects public endpoints from bot loops and automated scraping
 * while remaining friendly to diners sharing the same hotel Wi-Fi.
 */

export function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes default
  maxRequests = 30,           // Max allowed requests in window
  message = 'Too many requests. Please wait a few moments before trying again.',
  statusCode = 429,
} = {}) {
  const hitLog = new Map(); // ip -> Array of timestamps

  // Periodic cleanup every 5 minutes to prevent memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hitLog.entries()) {
      const activeHits = timestamps.filter(t => now - t < windowMs);
      if (activeHits.length === 0) {
        hitLog.delete(ip);
      } else {
        hitLog.set(ip, activeHits);
      }
    }
  }, 5 * 60 * 1000);

  // Allow Node process to exit without waiting on this timer
  if (cleanupInterval.unref) cleanupInterval.unref();

  return function rateLimiterMiddleware(req, res, next) {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown';
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : 'unknown';

    const now = Date.now();
    const timestamps = hitLog.get(clientIp) || [];

    // Filter hits within active sliding window
    const recentHits = timestamps.filter(t => now - t < windowMs);

    if (recentHits.length >= maxRequests) {
      console.warn(`[Security Alert: Rate Limit Exceeded] IP ${clientIp} exceeded ${maxRequests} requests within window.`);
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(statusCode).json({
        success: false,
        message,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    recentHits.push(now);
    hitLog.set(clientIp, recentHits);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - recentHits.length));

    next();
  };
}

// Pre-configured limiters for specific endpoint classes (accommodates shared hotel Wi-Fi)
export const feedbackSubmitLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 200, // Accommodates 200 diners per 15 min on shared Wi-Fi
  message: 'Too many feedback submissions from this network. Please wait a few moments before trying again.',
});

export const sessionInitLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 300,
  message: 'Too many feedback sessions initiated. Please wait a few moments.',
});

export const qrResolveLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 500,
  message: 'Too many QR code requests. Please wait a few moments.',
});

export const managerLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'production' ? 25 : 500, // 25 in production against brute force; 500 in dev/test
  message: 'Too many manager login attempts. For security, please wait 15 minutes before trying again.',
});
