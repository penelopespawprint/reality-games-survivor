/**
 * API Response Utilities
 *
 * Standardized response formats for API endpoints.
 * Ensures consistency across all routes.
 */

import { Response } from 'express';

// ============================================================================
// Error Response Types
// ============================================================================

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_INPUT: 'INVALID_INPUT',

  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  NOT_COMMISSIONER: 'NOT_COMMISSIONER',
  NOT_ADMIN: 'NOT_ADMIN',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  LEAGUE_NOT_FOUND: 'LEAGUE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EPISODE_NOT_FOUND: 'EPISODE_NOT_FOUND',

  // Conflict errors (409)
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_JOINED: 'ALREADY_JOINED',

  // Business logic errors (422)
  PICKS_LOCKED: 'PICKS_LOCKED',
  DRAFT_COMPLETED: 'DRAFT_COMPLETED',
  LEAGUE_FULL: 'LEAGUE_FULL',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Send a standardized error response
 */
export function sendError(
  res: Response,
  status: number,
  message: string,
  code?: ErrorCode,
  details?: Record<string, unknown>
): Response {
  const response: ApiError = { error: message };
  if (code) response.code = code;
  if (details) response.details = details;
  return res.status(status).json(response);
}

/**
 * Send a validation error (400)
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: Record<string, unknown>
): Response {
  return sendError(res, 400, message, ErrorCodes.VALIDATION_ERROR, details);
}

/**
 * Send a not found error (404)
 */
export function sendNotFound(
  res: Response,
  resource: string,
  code?: ErrorCode
): Response {
  return sendError(res, 404, `${resource} not found`, code ?? ErrorCodes.NOT_FOUND);
}

/**
 * Send a forbidden error (403)
 */
export function sendForbidden(
  res: Response,
  message: string = 'Access denied',
  code?: ErrorCode
): Response {
  return sendError(res, 403, message, code ?? ErrorCodes.FORBIDDEN);
}

/**
 * Send an internal server error (500)
 */
export function sendInternalError(
  res: Response,
  message: string = 'An internal error occurred',
  details?: Record<string, unknown>
): Response {
  return sendError(res, 500, message, ErrorCodes.INTERNAL_ERROR, details);
}

/**
 * Send a success response with data
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  status: number = 200,
  message?: string
): Response {
  const response: ApiSuccess<T> = { data };
  if (message) response.message = message;
  return res.status(status).json(response);
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, 201, message);
}

// ============================================================================
// Error Handling Wrapper
// ============================================================================

/**
 * Wrap an async route handler with error handling
 * Automatically catches errors and sends standardized error responses
 */
export function asyncHandler(
  fn: (req: any, res: Response) => Promise<any>
) {
  return async (req: any, res: Response) => {
    try {
      await fn(req, res);
    } catch (err: any) {
      console.error('Route error:', err);

      // Check for known error types
      if (err.message?.includes('not found')) {
        return sendNotFound(res, err.message.replace(' not found', ''));
      }

      // Default to internal error
      sendInternalError(res, err.message || 'An unexpected error occurred');
    }
  };
}
