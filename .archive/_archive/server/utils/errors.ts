import { Response } from 'express';

/**
 * Standardized API Error Response Format
 *
 * All API errors follow this structure:
 * {
 *   success: false,
 *   error: {
 *     code: "ERROR_CODE",
 *     message: "Human-readable message",
 *     details?: any  // Optional validation errors or additional context
 *   }
 * }
 */

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Common error codes
export const ErrorCodes = {
  // Authentication (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization (403)
  FORBIDDEN: 'FORBIDDEN',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',

  // Validation (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Not Found (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  LEAGUE_NOT_FOUND: 'LEAGUE_NOT_FOUND',

  // Conflict (409)
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  LEAGUE_FULL: 'LEAGUE_FULL',
  ALREADY_MEMBER: 'ALREADY_MEMBER',

  // Rate Limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Server Error (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Service Unavailable (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Send a standardized error response
 */
export function sendError(
  res: Response,
  status: number,
  code: ErrorCode | string,
  message: string,
  details?: unknown
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  res.status(status).json(response);
}

// Convenience methods for common error types

export function badRequest(res: Response, message: string, details?: unknown): void {
  sendError(res, 400, ErrorCodes.VALIDATION_ERROR, message, details);
}

export function unauthorized(res: Response, message = 'Authentication required'): void {
  sendError(res, 401, ErrorCodes.UNAUTHORIZED, message);
}

export function forbidden(res: Response, message = 'Access denied'): void {
  sendError(res, 403, ErrorCodes.FORBIDDEN, message);
}

export function notFound(res: Response, resource = 'Resource'): void {
  sendError(res, 404, ErrorCodes.NOT_FOUND, `${resource} not found`);
}

export function conflict(res: Response, code: ErrorCode, message: string): void {
  sendError(res, 409, code, message);
}

export function rateLimited(res: Response): void {
  sendError(res, 429, ErrorCodes.RATE_LIMITED, 'Too many requests. Please try again later.');
}

export function serverError(res: Response, message = 'Internal server error'): void {
  sendError(res, 500, ErrorCodes.INTERNAL_ERROR, message);
}

export function serviceUnavailable(res: Response, message = 'Service temporarily unavailable'): void {
  sendError(res, 503, ErrorCodes.SERVICE_UNAVAILABLE, message);
}
