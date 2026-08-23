import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

/**
 * Zod Validation Middleware
 *
 * OWASP A03:2021 – Injection
 * CWE-20: Improper Input Validation
 *
 * Validates req.body, req.query, or req.params against a Zod schema.
 * Returns 400 with structured error messages on failure.
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return next(
          new ApiError(400, `Validation failed: ${errors.map((e) => e.message).join(', ')}`)
        );
      }

      // Replace with sanitized/validated data
      if (source === 'body') req.body = result.data;
      else if (source === 'query') req.query = result.data;
      else req.params = result.data;

      next();
    } catch (err) {
      next(new ApiError(400, 'Invalid request data'));
    }
  };
};

// ══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ══════════════════════════════════════════════════════════════

/** Registration schema — strict email + password complexity */
export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(/^[a-zA-Z\u0600-\u06FF\s'-]+$/, 'Full name contains invalid characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address')
    .max(255, 'Email must not exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
}).strict();

/** Login schema */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address')
    .max(255, 'Email must not exceed 255 characters'),
  password: z
    .string()
    .min(1, 'Please provide a password')
    .max(128, 'Password must not exceed 128 characters'),
}).strict();

/** Chat query schema — sanitize question input */
export const chatQuerySchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Please provide a question')
    .max(2000, 'Question must not exceed 2000 characters'),
  sessionId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, 'Invalid session ID format')
    .optional()
    .nullable(),
}).strict();

/** MongoDB ObjectId param schema */
export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format'),
}).strict();

/** Evidence search query schema */
export const evidenceSearchSchema = z.object({
  q: z.string().trim().max(500, 'Search query too long').optional(),
  publisher: z.string().trim().max(50).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 5))
    .pipe(z.number().min(1).max(20)),
}).strict();
