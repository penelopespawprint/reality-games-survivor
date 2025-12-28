// server/logger.ts
// Structured logging with Pino - zero external services required
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

// Create base logger with appropriate settings
const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),

  // Pretty print in development, JSON in production (for Render log parsing)
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,

  // Base context added to all logs
  base: {
    env: process.env.NODE_ENV || "development",
  },

  // Redact sensitive fields from logs
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    remove: true,
  },
});

// Create child loggers for different modules
export function createLogger(module: string) {
  return logger.child({ module });
}

// Pre-configured loggers for common modules
export const authLogger = createLogger("auth");
export const picksLogger = createLogger("picks");
export const draftLogger = createLogger("draft");
export const leagueLogger = createLogger("league");
export const scoringLogger = createLogger("scoring");
export const smsLogger = createLogger("sms");
export const schedulerLogger = createLogger("scheduler");
export const paymentLogger = createLogger("payments");

// Request logging helper
export function logRequest(
  reqLogger: pino.Logger,
  req: { method: string; path: string; ip?: string },
  userId?: string
) {
  reqLogger.info(
    {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId,
    },
    "API request"
  );
}

// Error logging helper with stack trace
export function logError(
  errLogger: pino.Logger,
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  if (error instanceof Error) {
    errLogger.error(
      {
        err: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        ...context,
      },
      error.message
    );
  } else {
    errLogger.error({ err: error, ...context }, "Unknown error");
  }
}

export default logger;
