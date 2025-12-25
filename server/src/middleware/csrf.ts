import { Request, Response, NextFunction } from 'express';

/**
 * Origin-based CSRF protection middleware
 *
 * SECURITY DESIGN NOTES:
 * ----------------------
 * This API uses JWT authentication with tokens stored in client-side storage
 * (localStorage/sessionStorage), NOT cookies. This architecture provides
 * inherent CSRF protection because:
 *
 * 1. JWTs are stored in localStorage, not cookies
 * 2. Malicious sites cannot read localStorage from other origins (same-origin policy)
 * 3. Without the token, attackers cannot make authenticated requests
 * 4. The Authorization header must be explicitly set by JavaScript
 *
 * We add origin validation as defense-in-depth to:
 * - Ensure requests come from our known frontends
 * - Protect against misconfiguration (e.g., if cookies are ever added)
 * - Add an extra layer of security for state-changing operations
 *
 * MOBILE/NATIVE APP SUPPORT:
 * --------------------------
 * Native mobile apps don't send Origin headers but also aren't vulnerable
 * to traditional CSRF attacks (no browser cookie jar). We allow requests
 * with Authorization headers but no Origin as a fallback for these clients.
 *
 * @param allowedOrigins - List of allowed origin URLs
 */
export function originBasedCsrfProtection(allowedOrigins: string[]) {
  // Log configuration on startup
  if (allowedOrigins.length === 0) {
    console.warn('WARNING: CSRF protection has no allowed origins configured');
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip for safe methods (idempotent, no side effects)
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Skip for webhook endpoints (they use cryptographic signature verification)
    if (req.path.startsWith('/webhooks/')) {
      return next();
    }

    // Check Origin or Referer header
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';

    // Extract origin from referer if origin is not present
    let requestOrigin = origin;
    if (!requestOrigin && referer) {
      try {
        requestOrigin = new URL(referer).origin;
      } catch {
        requestOrigin = '';
      }
    }

    // If no origin info at all
    if (!requestOrigin) {
      // For authenticated requests without Origin (mobile apps, server-to-server):
      // The JWT in Authorization header provides authentication proof.
      // Since JWT is not automatically attached like cookies, the client
      // must have JavaScript access to the token, which means same-origin.
      if (req.headers.authorization) {
        return next();
      }

      // Unauthenticated requests without Origin are rejected
      // (legitimate browsers always send Origin for cross-origin requests)
      res.status(403).json({
        error: 'Origin header required',
        code: 'CSRF_ORIGIN_MISSING'
      });
      return;
    }

    // Validate origin against allowlist
    if (!allowedOrigins.includes(requestOrigin)) {
      console.warn(`CSRF: Rejected request from origin: ${requestOrigin}`);
      res.status(403).json({
        error: 'Invalid origin',
        code: 'CSRF_ORIGIN_INVALID'
      });
      return;
    }

    next();
  };
}
