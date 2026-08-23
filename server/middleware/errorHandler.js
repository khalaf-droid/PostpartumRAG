/**
 * Global Error Handler — Security Hardened
 *
 * Security features:
 * - Never exposes stack traces to clients (CWE-209)
 * - Handles specific Mongoose/JWT errors gracefully
 * - Structured logging instead of file-based error dumps
 * - Prevents information leakage about internals
 */

const handleCastErrorDB = (err) => {
  return { statusCode: 400, message: `Invalid ${err.path}: ${err.value}`, isOperational: true };
};

const handleDuplicateFieldDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  return { statusCode: 400, message: `Duplicate value for ${field}. Please use another value.`, isOperational: true };
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map((el) => el.message);
  return { statusCode: 400, message: `Invalid input: ${errors.join('. ')}`, isOperational: true };
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let isOperational = err.isOperational || false;

  // ── Handle specific error types ────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
    isOperational = true;
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again.';
    isOperational = true;
  }

  if (err.name === 'CastError') {
    const handled = handleCastErrorDB(err);
    statusCode = handled.statusCode;
    message = handled.message;
    isOperational = true;
  }

  if (err.code === 11000) {
    const handled = handleDuplicateFieldDB(err);
    statusCode = handled.statusCode;
    message = handled.message;
    isOperational = true;
  }

  if (err.name === 'ValidationError') {
    const handled = handleValidationErrorDB(err);
    statusCode = handled.statusCode;
    message = handled.message;
    isOperational = true;
  }

  // ── Structured server-side logging ─────────────────────────
  // Only log unexpected errors (not validation/auth issues)
  if (!isOperational) {
    console.error('[ERROR]', {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      statusCode,
      message: err.message,
      // Stack trace only to server logs, NEVER to client
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // ── Client response ────────────────────────────────────────
  const status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

  if (process.env.NODE_ENV === 'development') {
    // Development: show message but NOT full stack in response
    res.status(statusCode).json({
      status,
      message,
      // Only include error name in dev, not stack traces
      errorType: err.name,
    });
  } else {
    // Production: only show message for operational errors
    if (isOperational) {
      res.status(statusCode).json({
        status,
        message,
      });
    } else {
      // Generic message for unexpected errors
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong. Please try again later.',
      });
    }
  }
};
