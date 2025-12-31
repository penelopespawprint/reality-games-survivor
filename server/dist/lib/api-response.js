/**
 * API Response Utilities
 *
 * Standardized response formats for API endpoints.
 * Ensures consistency across all routes.
 */
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
};
// ============================================================================
// Response Helpers
// ============================================================================
/**
 * Send a standardized error response
 */
export function sendError(res, status, message, code, details) {
    const response = { error: message };
    if (code)
        response.code = code;
    if (details)
        response.details = details;
    return res.status(status).json(response);
}
/**
 * Send a validation error (400)
 */
export function sendValidationError(res, message, details) {
    return sendError(res, 400, message, ErrorCodes.VALIDATION_ERROR, details);
}
/**
 * Send a not found error (404)
 */
export function sendNotFound(res, resource, code) {
    return sendError(res, 404, `${resource} not found`, code ?? ErrorCodes.NOT_FOUND);
}
/**
 * Send a forbidden error (403)
 */
export function sendForbidden(res, message = 'Access denied', code) {
    return sendError(res, 403, message, code ?? ErrorCodes.FORBIDDEN);
}
/**
 * Send an internal server error (500)
 */
export function sendInternalError(res, message = 'An internal error occurred', details) {
    return sendError(res, 500, message, ErrorCodes.INTERNAL_ERROR, details);
}
/**
 * Send a success response with data
 */
export function sendSuccess(res, data, status = 200, message) {
    const response = { data };
    if (message)
        response.message = message;
    return res.status(status).json(response);
}
/**
 * Send a created response (201)
 */
export function sendCreated(res, data, message) {
    return sendSuccess(res, data, 201, message);
}
// ============================================================================
// Error Handling Wrapper
// ============================================================================
/**
 * Wrap an async route handler with error handling
 * Automatically catches errors and sends standardized error responses
 */
export function asyncHandler(fn) {
    return async (req, res) => {
        try {
            await fn(req, res);
        }
        catch (err) {
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
//# sourceMappingURL=api-response.js.map