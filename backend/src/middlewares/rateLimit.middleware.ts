import rateLimit from 'express-rate-limit';
import { isTestingMode } from '../config/env';

// Client-testing mode (RATE_LIMIT_RELAXED=true, or MOCK_SMS + ALLOW_MOCK_MESSAGING)
// raises the ceilings substantially so testers are not locked out, while still
// throttling genuine abuse.
const relaxed = isTestingMode;

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: relaxed ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    timestamp: new Date().toISOString(),
  },
});

// OTP: per phone number per hour (falls back to IP when no phone).
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: relaxed ? 100 : 10,
  keyGenerator: (req) => (req.body && (req.body.phone as string)) || req.ip || 'unknown',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many OTP requests for this number. Try again in an hour.' },
    timestamp: new Date().toISOString(),
  },
});

// Login: per IP per 15 minutes.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: relaxed ? 200 : 20,
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
  max: relaxed ? 600 : 60,
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
  max: relaxed ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many admin requests. Try again later.' },
    timestamp: new Date().toISOString(),
  },
});
