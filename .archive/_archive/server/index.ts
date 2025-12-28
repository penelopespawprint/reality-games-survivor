// server/index.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import type { CorsOptions } from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./auth.js";
import castawayRoutes from "./castaways.js";
import pickRoutes from "./picks.js";
import userRoutes from "./users.js";
import adminRoutes from "./admin.js";
import leagueRoutes from "./league.js";
import setupRoutes from "./setup.js";
import resultsRoutes from "./results.js";
import rankingRoutes from "./rankings.js";
import draftRoutes from "./draft.js";
import scoringRoutes from "./scoring.js";
import scoringDashboardRoutes from "./scoring-dashboard.js";
import feedbackRoutes from "./feedback.js";
import smsRoutes from "./sms.js";
import leaguesRoutes from "./leagues.js";
import leagueScopedRoutes from "./league-scoped.js";
import globalRoutes from "./global.js";
import seasonsRoutes from "./seasons.js";
import waitlistRoutes from "./waitlist.js";
import weeksRoutes from "./weeks.js";
import paymentsRoutes from "./routes/payments.js";
import prisma from "./prisma.js";
import { startScheduler } from "./scheduler.js";
import { setCsrfToken, validateCsrf } from "./middleware.js";
import logger, { createLogger, logError } from "./logger.js";
import { validateOrExit } from "./utils/validate-env.js";

const serverLogger = createLogger("server");
const socketLogger = createLogger("socket");

dotenv.config();

// Validate environment variables before proceeding
validateOrExit();

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 5050;

async function ensureDatabaseConnection() {
  try {
    await prisma.$connect();
    serverLogger.info("Database connection established");
  } catch (error) {
    logError(serverLogger, error, { context: "database_connection" });
  }
}

ensureDatabaseConnection();

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? allowedOrigins.length > 0
        ? allowedOrigins
        : true
      : true,
  credentials: true
};

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  serverLogger.warn("No CLIENT_ORIGIN configured. Defaulting to allow all origins.");
}

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: corsOptions
});

// Socket.io connection handler with room support
io.on("connection", (socket) => {
  socketLogger.debug({ socketId: socket.id }, "Client connected");

  // Join leaderboard room for targeted updates
  socket.on("join:leaderboard", () => {
    socket.join("leaderboard");
    socketLogger.debug({ socketId: socket.id, room: "leaderboard" }, "Joined room");
  });

  // Leave leaderboard room
  socket.on("leave:leaderboard", () => {
    socket.leave("leaderboard");
    socketLogger.debug({ socketId: socket.id, room: "leaderboard" }, "Left room");
  });

  // Join league-specific room for targeted league updates
  socket.on("join:league", (leagueId: string) => {
    if (typeof leagueId === "string" && leagueId.length > 0) {
      socket.join(`league:${leagueId}`);
      socketLogger.debug({ socketId: socket.id, leagueId }, "Joined league room");
    }
  });

  // Leave league-specific room
  socket.on("leave:league", (leagueId: string) => {
    if (typeof leagueId === "string" && leagueId.length > 0) {
      socket.leave(`league:${leagueId}`);
      socketLogger.debug({ socketId: socket.id, leagueId }, "Left league room");
    }
  });

  socket.on("disconnect", () => {
    socketLogger.debug({ socketId: socket.id }, "Client disconnected");
  });
});

// Export io instance for use in other files
export { io };

// Trust proxy - required when running behind Render or other reverse proxies
// This allows Express to correctly read X-Forwarded-For headers
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors(corsOptions));
app.use(cookieParser());

// CSRF protection - set token cookie and validate on state-changing requests
app.use(setCsrfToken);
app.use("/api", validateCsrf);

// Stripe webhook needs raw body for signature verification
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// JSON parsing for all other routes
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
    };
    // Skip health checks and static files from logs
    if (req.path === "/health" || req.path.startsWith("/assets")) {
      return;
    }
    if (res.statusCode >= 400) {
      serverLogger.warn(logData, "Request failed");
    } else if (duration > 1000) {
      serverLogger.warn(logData, "Slow request");
    } else {
      serverLogger.debug(logData, "Request completed");
    }
  });
  next();
});

// Standardized rate limit error response
const rateLimitResponse = {
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
  },
};

// Rate limiting for auth endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Strict rate limiter for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Admin operations: 30 req/min
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for sensitive operations (payments, user data changes)
const sensitiveLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Sensitive operations: 20 req/min
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false
});

// Serve persistent uploads directory (survives Vite rebuilds)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes with tiered rate limiting
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", apiLimiter); // General rate limit for all API routes

// Admin routes - strict rate limiting
app.use("/api/admin", adminLimiter, adminRoutes);
app.use("/api/admin/scoring", adminLimiter, scoringRoutes);
app.use("/api/admin/scoring-dashboard", adminLimiter, scoringDashboardRoutes);
app.use("/api/setup", adminLimiter, setupRoutes);

// Sensitive routes - moderate rate limiting
app.use("/api/payments", sensitiveLimiter, paymentsRoutes);
app.use("/api/users", sensitiveLimiter, userRoutes);

// Standard routes
app.use("/api/castaways", castawayRoutes);
app.use("/api/picks", pickRoutes);
app.use("/api/league", leagueRoutes);
app.use("/api/results", resultsRoutes);
app.use("/api/rankings", rankingRoutes);
app.use("/api/draft", draftRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/sms", smsRoutes);

// Multi-league endpoints
app.use("/api/leagues", leaguesRoutes); // League management: create, join, my-leagues
app.use("/api/leagues", leagueScopedRoutes); // League-scoped: /:leagueId/standings, picks, draft
app.use("/api/global", globalRoutes); // Global: standings, stats

// Multi-season endpoints
app.use("/api/seasons", seasonsRoutes); // Season management: list, active, create, transition
app.use("/api/waitlist", waitlistRoutes); // Waitlist: join, status, count, leaderboard
app.use("/api/weeks", weeksRoutes); // Weeks: schedule, active week

// Health check endpoint for Render
app.get("/health", async (_req, res) => {
  const health: {
    status: string;
    timestamp: string;
    database: string;
    uptime: number;
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "unknown",
    uptime: process.uptime(),
  };

  try {
    // Check database connectivity with a simple query
    await prisma.$queryRaw`SELECT 1`;
    health.database = "connected";
  } catch (error) {
    health.database = "disconnected";
    health.status = "degraded";
    serverLogger.error({ error }, "Health check: database unreachable");
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const publicPath = path.resolve(process.cwd(), "dist", "public");

  // Serve static assets with aggressive caching (1 year for hashed files)
  // Vite adds content hashes to JS/CSS so they can be cached indefinitely
  app.use('/assets', express.static(path.join(publicPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
    etag: true,
  }));

  // Other static files (images, fonts) with moderate caching
  app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: true,
    index: false, // Don't serve index.html from static middleware
  }));

  // Serve React app for non-API routes - always fresh to pick up new deploys
  app.get('/', (req, res) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // Catch all handler for client-side routing (but not API routes)
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  app.get("/", (_, res) => res.send("RGFL backend is running."));
}

// Global error handler - standardized error response format
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logError(serverLogger, err, {
    method: req.method,
    path: req.path,
    userId: (req as { user?: { id?: string } }).user?.id,
  });
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
});

httpServer.listen(PORT, () => {
  serverLogger.info({ port: PORT }, "Server started");
  serverLogger.info("Socket.io ready for connections");

  // Start background job scheduler (includes SMS reminders)
  startScheduler();
});
