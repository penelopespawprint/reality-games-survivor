import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

// CSRF token storage (in production, use Redis or similar)
const csrfTokens = new Map<string, { token: string; expires: number }>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < now) {
      csrfTokens.delete(key);
    }
  }
}, 60 * 1000); // Every minute

/**
 * Generate a CSRF token for a session
 */
export function generateCsrfToken(sessionId: string): string {
  const token = randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  return token;
}

/**
 * Verify a CSRF token
 */
function verifyCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  if (!stored) return false;
  if (stored.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  return stored.token === token;
}

/**
 * CSRF protection middleware
 *
 * This middleware protects against Cross-Site Request Forgery attacks by:
 * 1. Checking for a valid CSRF token in the X-CSRF-Token header
 * 2. Only applying to state-changing methods (POST, PUT, PATCH, DELETE)
 * 3. Skipping protection for webhook endpoints (they use signature verification)
 *
 * For SPA apps with JWT auth, we use the Synchronizer Token Pattern where:
 * - The token is provided via a GET /api/csrf-token endpoint
 * - The client includes it in the X-CSRF-Token header for state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip for webhook endpoints (they use signature verification)
  if (req.path.startsWith('/webhooks/')) {
    return next();
  }

  // Skip for API endpoints that use API keys or other auth mechanisms
  if (req.path.startsWith('/api/public/')) {
    return next();
  }

  // For state-changing requests, verify CSRF token
  const csrfToken = req.headers['x-csrf-token'] as string | undefined;

  // Get session ID from the authorization token or cookie
  const authHeader = req.headers.authorization;
  const sessionId = authHeader ? authHeader.replace('Bearer ', '').substring(0, 32) : undefined;

  if (!sessionId) {
    // No session means no CSRF token needed (unauthenticated request)
    // The auth middleware will handle rejecting unauthorized requests
    return next();
  }

  if (!csrfToken) {
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  if (!verifyCsrfToken(sessionId, csrfToken)) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}

/**
 * Route handler to get a CSRF token
 * Add this route: GET /api/csrf-token
 */
export function csrfTokenHandler(req: Request, res: Response): void {
  const authHeader = req.headers.authorization;
  const sessionId = authHeader ? authHeader.replace('Bearer ', '').substring(0, 32) : undefined;

  if (!sessionId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = generateCsrfToken(sessionId);
  res.json({ csrfToken: token });
}

/**
 * Alternative: Origin-based CSRF protection
 * Simpler approach that validates the Origin/Referer header
 * Works well for APIs that only accept requests from known origins
 */
export function originBasedCsrfProtection(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Skip for webhooks
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

    // If no origin info at all (same-origin requests sometimes don't include it)
    if (!requestOrigin) {
      // Accept requests without origin if they have authorization header
      // This handles mobile apps and server-to-server requests
      if (req.headers.authorization) {
        return next();
      }
      res.status(403).json({ error: 'Origin header required' });
      return;
    }

    // Validate origin
    if (!allowedOrigins.includes(requestOrigin)) {
      res.status(403).json({ error: 'Invalid origin' });
      return;
    }

    next();
  };
}
