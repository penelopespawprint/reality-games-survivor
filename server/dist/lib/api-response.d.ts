/**
 * API Response Utilities
 *
 * Standardized response formats for API endpoints.
 * Ensures consistency across all routes.
 */
import { Response } from 'express';
export interface ApiError {
    error: string;
    code?: string;
    details?: Record<string, unknown>;
}
export interface ApiSuccess<T> {
    data: T;
    message?: string;
}
export declare const ErrorCodes: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly MISSING_FIELD: "MISSING_FIELD";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly NOT_COMMISSIONER: "NOT_COMMISSIONER";
    readonly NOT_ADMIN: "NOT_ADMIN";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly LEAGUE_NOT_FOUND: "LEAGUE_NOT_FOUND";
    readonly USER_NOT_FOUND: "USER_NOT_FOUND";
    readonly EPISODE_NOT_FOUND: "EPISODE_NOT_FOUND";
    readonly ALREADY_EXISTS: "ALREADY_EXISTS";
    readonly DUPLICATE_ENTRY: "DUPLICATE_ENTRY";
    readonly ALREADY_JOINED: "ALREADY_JOINED";
    readonly PICKS_LOCKED: "PICKS_LOCKED";
    readonly DRAFT_COMPLETED: "DRAFT_COMPLETED";
    readonly LEAGUE_FULL: "LEAGUE_FULL";
    readonly NOT_ELIGIBLE: "NOT_ELIGIBLE";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
};
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
/**
 * Send a standardized error response
 */
export declare function sendError(res: Response, status: number, message: string, code?: ErrorCode, details?: Record<string, unknown>): Response;
/**
 * Send a validation error (400)
 */
export declare function sendValidationError(res: Response, message: string, details?: Record<string, unknown>): Response;
/**
 * Send a not found error (404)
 */
export declare function sendNotFound(res: Response, resource: string, code?: ErrorCode): Response;
/**
 * Send a forbidden error (403)
 */
export declare function sendForbidden(res: Response, message?: string, code?: ErrorCode): Response;
/**
 * Send an internal server error (500)
 */
export declare function sendInternalError(res: Response, message?: string, details?: Record<string, unknown>): Response;
/**
 * Send a success response with data
 */
export declare function sendSuccess<T>(res: Response, data: T, status?: number, message?: string): Response;
/**
 * Send a created response (201)
 */
export declare function sendCreated<T>(res: Response, data: T, message?: string): Response;
/**
 * Wrap an async route handler with error handling
 * Automatically catches errors and sends standardized error responses
 */
export declare function asyncHandler(fn: (req: any, res: Response) => Promise<any>): (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=api-response.d.ts.map