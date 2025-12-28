import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockResponse,
  createMockUser,
  createMockLeague,
  createMockSeason,
} from './setup';

// Test the error utilities
describe('Error Utilities', () => {
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    res = createMockResponse();
  });

  it('should create standardized error response format', async () => {
    // Import dynamically to allow mocks to be applied
    const { sendError, ErrorCodes } = await import('../utils/errors.js');

    sendError(res, 400, ErrorCodes.VALIDATION_ERROR, 'Invalid input', { field: 'email' });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email' },
      },
    });
  });

  it('should create 401 unauthorized response', async () => {
    const { unauthorized } = await import('../utils/errors.js');

    unauthorized(res, 'Token expired');

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token expired',
      },
    });
  });

  it('should create 404 not found response', async () => {
    const { notFound } = await import('../utils/errors.js');

    notFound(res, 'League');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'League not found',
      },
    });
  });

  it('should create 500 server error response', async () => {
    const { serverError } = await import('../utils/errors.js');

    serverError(res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });
});

// Test mock factories
describe('Test Mock Factories', () => {
  it('should create mock user with defaults', () => {
    const user = createMockUser();

    expect(user.id).toBe('test-user-id');
    expect(user.email).toBe('test@example.com');
    expect(user.isAdmin).toBe(false);
  });

  it('should create mock user with overrides', () => {
    const user = createMockUser({ isAdmin: true, name: 'Admin User' });

    expect(user.isAdmin).toBe(true);
    expect(user.name).toBe('Admin User');
  });

  it('should create mock league with defaults', () => {
    const league = createMockLeague();

    expect(league.type).toBe('OFFICIAL');
    expect(league.status).toBe('OPEN');
    expect(league.maxPlayers).toBe(18);
  });

  it('should create mock season with defaults', () => {
    const season = createMockSeason();

    expect(season.isActive).toBe(true);
    expect(season.number).toBe(47);
  });
});

// Test environment validation
describe('Environment Validation', () => {
  it('should validate environment variables', async () => {
    const { validateEnvironment } = await import('../utils/validate-env.js');

    const result = validateEnvironment();

    // In test environment, we have mock env vars set
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
  });
});
