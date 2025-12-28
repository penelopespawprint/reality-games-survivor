/**
 * Structured Logging with Pino
 *
 * Replaces console.log with structured, leveled logging.
 * In production: JSON format for log aggregation
 * In development: Pretty printed for readability
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// Configure pino options
const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  // Add timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
  // Base context added to all logs
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'rgfl-api',
  },
  // Redact sensitive fields
  redact: {
    paths: ['password', 'token', 'authorization', 'cookie', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
};

// In development, use pretty printing
const transport = isProduction
  ? undefined
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,env,service',
      },
    };

export const logger = pino(pinoOptions, transport ? pino.transport(transport) : undefined);

// Create child loggers for different modules
export const createLogger = (module: string) => logger.child({ module });

// Convenience loggers
export const authLogger = createLogger('auth');
export const apiLogger = createLogger('api');
export const dbLogger = createLogger('database');
export const paymentLogger = createLogger('payments');
export const socketLogger = createLogger('websocket');

// Request context logger (for correlation IDs)
export const createRequestLogger = (requestId: string, userId?: string) =>
  logger.child({ requestId, userId });

export default logger;
