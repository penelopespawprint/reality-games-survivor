// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "./prisma.js";
import { authLogger, logError } from "./logger.js";
import { AuthenticatedRequest, AuthUser } from "./types.js";

// CSRF Protection using double-submit cookie pattern
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Middleware to set CSRF token cookie
 * Call this on initial page load or auth endpoints
 */
export function setCsrfToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Generate token if not present in cookies
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Skips validation for:
 * - GET, HEAD, OPTIONS requests
 * - Bearer token auth (mobile apps, not vulnerable to CSRF)
 * - Webhook endpoints (use signature verification)
 */
export function validateCsrf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Skip for safe methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip for webhook endpoints (they use signature verification)
  if (req.path.includes("/webhook")) {
    return next();
  }

  // Skip for Bearer token auth (mobile apps aren't vulnerable to CSRF)
  // CSRF exploits cookie-based auth; Bearer tokens must be explicitly sent
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return next();
  }

  // Get token from cookie and header
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  // Validate tokens match
  if (!cookieToken || !headerToken) {
    authLogger.warn({ path: req.path, method: req.method }, "CSRF validation failed: missing tokens");
    return res.status(403).json({ error: "CSRF token missing" });
  }

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    authLogger.warn({ path: req.path, method: req.method }, "CSRF validation failed: token mismatch");
    return res.status(403).json({ error: "CSRF token invalid" });
  }

  next();
}

/**
 * Extract leagueId from request (query param, header, or body)
 * Priority: query > header > body
 */
export function getLeagueId(req: Request): string | null {
  return (
    (req.query.leagueId as string) ||
    (req.headers['x-league-id'] as string) ||
    req.body?.leagueId ||
    null
  );
}

/**
 * Require leagueId middleware - use for routes that MUST have a league context
 */
export function requireLeague(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const leagueId = getLeagueId(req);
  if (!leagueId) {
    return res.status(400).json({ error: "leagueId is required" });
  }
  req.leagueId = leagueId;
  next();
}

/**
 * Require League Membership Middleware
 *
 * Validates that the authenticated user is a member of the specified league.
 * MUST be used after authenticate middleware.
 *
 * Extracts leagueId from: URL params (:leagueId), query param, header, or body
 */
export async function requireLeagueMembership(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Try multiple sources for leagueId
  const leagueId = req.params.leagueId || req.params.id || getLeagueId(req);
  if (!leagueId) {
    return res.status(400).json({ error: "leagueId is required" });
  }

  try {
    // Check if user is a member of this league
    const membership = await prisma.leagueMembership.findFirst({
      where: {
        userId,
        leagueId,
        isActive: true,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: "Not a member of this league" });
    }

    // Attach league info to request
    (req as any).leagueId = leagueId;
    (req as any).leagueMembership = membership;
    next();
  } catch (error) {
    console.error("requireLeagueMembership error:", error);
    return res.status(500).json({ error: "Failed to verify league membership" });
  }
}

/**
 * Require League Admin Middleware
 *
 * Validates that the authenticated user is an ADMIN of the specified league.
 * MUST be used after authenticate middleware.
 */
export async function requireLeagueAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const leagueId = req.params.leagueId || req.params.id || getLeagueId(req);
  if (!leagueId) {
    return res.status(400).json({ error: "leagueId is required" });
  }

  try {
    const membership = await prisma.leagueMembership.findFirst({
      where: {
        userId,
        leagueId,
        isActive: true,
        role: "ADMIN",
      },
    });

    if (!membership) {
      return res.status(403).json({ error: "League admin access required" });
    }

    (req as any).leagueId = leagueId;
    (req as any).leagueMembership = membership;
    next();
  } catch (error) {
    console.error("requireLeagueAdmin error:", error);
    return res.status(500).json({ error: "Failed to verify league admin status" });
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    authLogger.fatal("JWT_SECRET environment variable is required in production!");
    process.exit(1);
  }
  authLogger.warn("JWT_SECRET not set. Using insecure development fallback.");
}
const SECRET = JWT_SECRET || "development-insecure-jwt-secret-DO-NOT-USE-IN-PRODUCTION";

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const token = bearerToken || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const payload = jwt.verify(token, SECRET) as AuthUser;
    req.user = payload;
    return next();
  } catch (error) {
    authLogger.warn({ path: req.path }, "JWT verification failed");
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authenticate(req, res, async () => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }
      next();
    } catch (error) {
      logError(authLogger, error, { userId, context: "require_admin" });
      next(error);
    }
  });
}

/**
 * Season Context Middleware
 *
 * Attaches the current season context to the request.
 * Can be used by routes that need to be season-aware.
 *
 * Priority:
 * 1. Query param: ?seasonId=xxx or ?season=49
 * 2. Header: X-Season-Id or X-Season-Number
 * 3. Default: Active season
 *
 * Attaches to req.season:
 *   { id: string, number: number, status: SeasonStatus, ... }
 */
export async function withSeasonContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let season = null;

    // Check query params first
    const seasonId = req.query.seasonId as string;
    const seasonNumber = req.query.season as string;

    // Check headers
    const headerSeasonId = req.headers['x-season-id'] as string;
    const headerSeasonNumber = req.headers['x-season-number'] as string;

    if (seasonId || headerSeasonId) {
      // Lookup by ID
      season = await prisma.season.findUnique({
        where: { id: seasonId || headerSeasonId },
      });
    } else if (seasonNumber || headerSeasonNumber) {
      // Lookup by number
      const num = parseInt(seasonNumber || headerSeasonNumber, 10);
      if (!isNaN(num)) {
        season = await prisma.season.findUnique({
          where: { number: num },
        });
      }
    }

    // Default to active season
    if (!season) {
      season = await prisma.season.findFirst({
        where: { isActive: true },
      });
    }

    // Ultimate fallback: most recent season
    if (!season) {
      season = await prisma.season.findFirst({
        orderBy: { number: 'desc' },
      });
    }

    req.season = season;
    next();
  } catch (error) {
    logError(authLogger, error, { context: "season_context" });
    // Don't fail the request, just continue without season context
    req.season = null;
    next();
  }
}

/**
 * Require Season Context Middleware
 *
 * Like withSeasonContext but returns 400 if no season found.
 * Use for routes that absolutely require a season context.
 */
export async function requireSeasonContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await withSeasonContext(req, res, () => {
    if (!req.season) {
      return res.status(400).json({ error: 'No active season found' });
    }
    next();
  });
}

/**
 * Helper to get seasonId from request
 * Useful for routes that support optional season filtering
 */
export function getSeasonId(req: AuthenticatedRequest): string | undefined {
  return req.season?.id;
}

/**
 * Helper to check if current season allows certain operations
 */
export function canSubmitRankings(req: AuthenticatedRequest): boolean {
  const season = req.season;
  return Boolean(season?.rankingsOpen && !season?.seasonLocked);
}

export function canMakePicks(req: AuthenticatedRequest): boolean {
  const season = req.season;
  return Boolean(season?.seasonLocked && season?.status === 'ACTIVE');
}

export function canJoinLeagues(req: AuthenticatedRequest): boolean {
  const season = req.season;
  return Boolean(season && !season.seasonLocked && ['COLLECTING', 'DRAFT_WEEK'].includes(season.status));
}
