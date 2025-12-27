/**
 * Health Check Routes
 *
 * Provides simple and detailed health check endpoints for monitoring.
 */

import { Router, Request, Response } from 'express';
import { performHealthCheck } from '../services/health.js';
import type { SimpleHealthResponse, DetailedHealthResponse } from '../types/health.js';

const router = Router();

/**
 * GET /health
 *
 * Health check endpoint with optional detailed diagnostics.
 *
 * Query parameters:
 * - detailed: If 'true', returns comprehensive diagnostics
 *
 * Simple response (default):
 * - 200 OK: { status: 'ok', timestamp: ISO8601 }
 *
 * Detailed response (?detailed=true):
 * - 200 OK: All checks pass or warn
 * - 503 Service Unavailable: Any check fails
 */
router.get('/health', async (req: Request, res: Response) => {
  // Check for detailed query parameter
  const detailed = req.query.detailed === 'true';

  if (!detailed) {
    // Simple health check for monitoring services
    const response: SimpleHealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json(response);
  }

  try {
    // Perform detailed health check
    const healthCheck: DetailedHealthResponse = await performHealthCheck();

    // Return 503 if any component is unhealthy
    const statusCode = healthCheck.status === 'unhealthy' ? 503 : 200;

    return res.status(statusCode).json(healthCheck);
  } catch (err) {
    // If health check itself fails, return error
    console.error('Health check failed:', err);

    const errorResponse: DetailedHealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'fail',
          error: 'Health check system error',
        },
        scheduler: {
          status: 'fail',
          running: false,
          error: 'Health check system error',
        },
        recentJobFailures: {
          status: 'fail',
          count: 0,
          error: 'Health check system error',
        },
      },
    };

    return res.status(503).json(errorResponse);
  }
});

export default router;
