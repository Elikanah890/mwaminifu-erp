import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    timestamp: new Date().toISOString(),
  },
});

// OTP: max 3 requests per phone number per hour (falls back to IP when no phone).
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => (req.body && (req.body.phone as string)) || req.ip || 'unknown',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many OTP requests for this number. Try again in an hour.' },
    timestamp: new Date().toISOString(),
  },
});

// Login: max 5 attempts per 15 minutes per IP.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.' },
    timestamp: new Date().toISOString(),
  },
});

// Writes: conservative throttle on top of the general limiter for sensitive
// mutations (sales, stock, employees, expenses, purchases...).
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
    timestamp: new Date().toISOString(),
  },
});

export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many admin requests. Try again later.' },
    timestamp: new Date().toISOString(),
  },
});
