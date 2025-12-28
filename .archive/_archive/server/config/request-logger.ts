/**
 * Request Logging Middleware
 *
 * Adds correlation IDs to requests and logs request/response info.
 * Useful for debugging and tracing requests through the system.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { apiLogger } from './logger.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

/**
 * Middleware to add request ID and log requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Generate or use existing correlation ID
  req.requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('x-request-id', req.requestId);

  // Log request start (skip health checks to reduce noise)
  if (req.path !== '/health') {
    apiLogger.info({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: (req as any).user?.id,
    }, `→ ${req.method} ${req.path}`);
  }

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userId: (req as any).user?.id,
    };

    // Skip health checks
    if (req.path === '/health') return;

    // Log based on status code
    if (res.statusCode >= 500) {
      apiLogger.error(logData, `← ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    } else if (res.statusCode >= 400) {
      apiLogger.warn(logData, `← ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    } else {
      apiLogger.info(logData, `← ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    }

    // Log slow requests
    if (duration > 1000) {
      apiLogger.warn({ ...logData, slow: true }, `Slow request: ${req.path} took ${duration}ms`);
    }
  });

  next();
}

export default requestLogger;
