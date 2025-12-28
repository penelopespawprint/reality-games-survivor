// @ts-nocheck
import express from "express";
import { createLogger, logError } from "./logger.js";
const logger = createLogger("auth");
import type { CookieOptions, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { z } from "zod";
import prisma from "./prisma.js";
import { sendWelcomeEmail } from "./email.js";
import { autoAssignToOfficialLeague } from "./utils/league-assignment.js";

const router = express.Router();

// Auth0 Configuration
const AUTH0_DOMAIN = process.env.VITE_AUTH0_DOMAIN || 'dev-w01qewse7es4d0ue.us.auth0.com';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || `https://${AUTH0_DOMAIN}/api/v2/`;

// JWKS client for Auth0 token validation
const jwksClient = new JwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

// Helper to get signing key from Auth0
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  jwksClient.getSigningKey(header.kid, (err: Error | null, key: any) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Cookie settings for session management
const sameSiteSetting: CookieOptions["sameSite"] =
  process.env.NODE_ENV === "production" ? "none" : "lax";

const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: sameSiteSetting,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// User type for authenticated requests
interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  auth0Id?: string;
}

// Extended request with user info
interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Middleware to validate Auth0 tokens
export const validateAuth0Token = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if ((req as any).cookies?.auth0Token) {
      token = (req as any).cookies.auth0Token;
    }

    if (!token) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    // Verify the Auth0 token
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `https://${AUTH0_DOMAIN}/`
      },
      async (err, decoded) => {
        if (err) {
          logger.error("Auth0 token validation error:", err.message);
          return res.status(401).json({ error: "Invalid or expired token" });
        }

        const payload = decoded as jwt.JwtPayload;

        // Find user by Auth0 sub (subject) or email
        const email = payload.email || payload['https://rgfl.app/email'];
        const auth0Id = payload.sub;

        if (!email && !auth0Id) {
          return res.status(401).json({ error: "Token missing user identifier" });
        }

        try {
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: email || undefined },
                // Could add auth0Id field to User model in future
              ]
            }
          });

          if (!user && email) {
            // Auto-create user on first login via Auth0
            let league = await prisma.league.findFirst();
            if (!league) {
              league = await prisma.league.create({
                data: { name: "Official League", code: "OFFICIAL2025" }
              });
            }

            user = await prisma.user.create({
              data: {
                email,
                name: payload.name || payload.nickname || email.split('@')[0],
                password: null,
                profilePicture: payload.picture,
                leagueId: league.id,
                hasSeenWelcome: false
              }
            });

            // Auto-assign to official league (non-blocking)
            autoAssignToOfficialLeague(user.id).catch(err =>
              logger.error("Failed to auto-assign to Official League:", err)
            );

            // Send welcome email (non-blocking)
            sendWelcomeEmail(email, user.name).catch(err =>
              logger.error("Failed to send welcome email:", err)
            );
          }

          if (!user) {
            return res.status(401).json({ error: "User not found" });
          }

          req.user = {
            id: user.id,
            email: user.email,
            isAdmin: user.isAdmin,
            auth0Id
          };

          next();
        } catch (dbError) {
          logger.error("Database error during auth:", dbError);
          return res.status(500).json({ error: "Authentication failed" });
        }
      }
    );
  } catch (error) {
    logger.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

// Zod schema for Auth0 login/sync
const auth0SyncSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  picture: z.string().url().optional().nullable(),
  sub: z.string().optional() // Auth0 user ID
});

// POST /auth0-sync - Sync user data from Auth0 after frontend login
// This is called by the frontend after Auth0 authentication to ensure user exists in DB
router.post("/auth0-sync", async (req, res) => {
  try {
    const data = auth0SyncSchema.parse(req.body);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      // Get the default league
      let league = await prisma.league.findFirst();
      if (!league) {
        league = await prisma.league.create({
          data: { name: "Official League", code: "OFFICIAL2025" }
        });
      }

      // Create new user with Auth0 data
      user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name || data.email.split('@')[0],
          password: null, // No password for Auth0 users
          profilePicture: data.picture,
          leagueId: league.id,
          hasSeenWelcome: false
        }
      });

      // Auto-assign to official league (non-blocking)
      autoAssignToOfficialLeague(user.id).catch(err =>
        logger.error("Failed to auto-assign to Official League:", err)
      );

      // Send welcome email for new users (non-blocking)
      sendWelcomeEmail(data.email, user.name).catch(err =>
        logger.error("Failed to send welcome email:", err)
      );
    } else {
      // Update profile picture if changed
      if (data.picture && data.picture !== user.profilePicture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { profilePicture: data.picture }
        });
      }
    }

    // Return user data (no JWT needed - frontend uses Auth0 tokens)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        displayName: user.displayName,
        city: user.city,
        state: user.state,
        favoriteCastaway: user.favoriteCastaway,
        about: user.about,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        hasSeenWelcome: user.hasSeenWelcome
      }
    });
  } catch (error) {
    logger.error("Auth0 sync error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to sync user data" });
  }
});

// GET /me - Get current authenticated user (validates Auth0 token)
router.get("/me", async (req, res) => {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if ((req as any).cookies?.auth0Token) {
      token = (req as any).cookies.auth0Token;
    }

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    // Verify the Auth0 token
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `https://${AUTH0_DOMAIN}/`
      },
      async (err, decoded) => {
        if (err) {
          logger.error("Auth /me token error:", err.message);
          return res.status(401).json({ error: "Invalid token" });
        }

        const payload = decoded as jwt.JwtPayload;
        const email = payload.email || payload['https://rgfl.app/email'];

        if (!email) {
          return res.status(401).json({ error: "Token missing email" });
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              username: true,
              profilePicture: true,
              isAdmin: true,
              hasSeenWelcome: true
            }
          });

          if (!user) {
            return res.status(401).json({ error: "User not found" });
          }

          res.json(user);
        } catch (dbError: any) {
          logger.error("Auth /me error:", dbError);
          if (dbError.code === 'P1001') {
            return res.status(503).json({ error: "Database not available. Please try again later." });
          }
          res.status(500).json({ error: "Failed to fetch user" });
        }
      }
    );
  } catch (error) {
    logger.error("Auth /me error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// POST /logout - Clear any server-side session data
router.post("/logout", (req, res) => {
  res
    .clearCookie("auth0Token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: sameSiteSetting
    })
    .json({ message: "Logged out successfully" });
});

// Legacy endpoint - redirect to Auth0
// Keeping temporarily for backwards compatibility
router.post("/auth0-login", async (req, res) => {
  logger.warn("DEPRECATED: /auth0-login endpoint used. Please use /auth0-sync instead.");

  try {
    const { email, name, picture } = req.body as {
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      let league = await prisma.league.findFirst();
      if (!league) {
        league = await prisma.league.create({
          data: { name: "Official League", code: "OFFICIAL2025" }
        });
      }

      user = await prisma.user.create({
        data: {
          email,
          name,
          password: null,
          profilePicture: picture,
          leagueId: league.id,
          hasSeenWelcome: false
        }
      });

      sendWelcomeEmail(email, name).catch(err =>
        logger.error("Failed to send welcome email:", err)
      );
    }

    // Return user data (no JWT - frontend should use Auth0 tokens)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        displayName: user.displayName,
        city: user.city,
        state: user.state,
        favoriteCastaway: user.favoriteCastaway,
        about: user.about,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        hasSeenWelcome: user.hasSeenWelcome
      }
    });
  } catch (error) {
    logger.error("Auth0 login error:", error);
    res.status(500).json({ error: "Failed to process Auth0 login" });
  }
});

export default router;
