import rateLimit from 'express-rate-limit';

/**
 * Rate Limiters — Defense against brute-force, credential stuffing, and DoS.
 *
 * OWASP A07:2021 – Identification and Authentication Failures
 * CWE-307: Improper Restriction of Excessive Authentication Attempts
 */

const isTest = process.env.NODE_ENV === 'test';

// ── Strict limiter for authentication endpoints ────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 10,  // 1000 in test mode, 10 in production
  skipSuccessfulRequests: false,
  standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,      // Disable `X-RateLimit-*` headers
  message: {
    status: 'fail',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  keyGenerator: (req) => {
    // Use IP + email (if provided) for more granular limiting
    const email = req.body?.email || '';
    return `${req.ip}-${email}`;
  },
});

// ── Stricter limiter for registration (prevent spam) ───────
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 1000 : 5,   // 1000 in test mode, 5 in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many accounts created from this IP. Please try again after an hour.',
  },
});

// ── General API limiter ────────────────────────────────────
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 100, // 1000 in test mode, 100 in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many requests. Please slow down.',
  },
});

// ── Chat/RAG query limiter (expensive operations) ──────────
export const queryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: isTest ? 1000 : 10,  // 1000 in test mode, 10 in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Query rate limit exceeded. Please wait a moment before asking another question.',
  },
});
