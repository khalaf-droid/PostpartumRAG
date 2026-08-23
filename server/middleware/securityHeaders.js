/**
 * Additional Security Headers Middleware
 *
 * Supplements Helmet with application-specific headers.
 * OWASP A05:2021 – Security Misconfiguration
 */
export const securityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS filtering in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent information leakage via Referer header
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict permissions/features the browser can use
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Remove server identification header
  res.removeHeader('X-Powered-By');

  // Cache control for API responses — prevent caching of sensitive data
  if (req.path.startsWith('/api/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }

  next();
};
