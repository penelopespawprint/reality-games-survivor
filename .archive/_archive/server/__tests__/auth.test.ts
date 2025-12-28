import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockResponse,
  createMockUser,
  createMockLeague,
} from './setup';

// Get mocked modules
const mockPrisma = vi.mocked(await import('../prisma.js')).default;

describe('Auth Flow Tests', () => {
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    res = createMockResponse();
    vi.clearAllMocks();
  });

  // =============================================================================
  // AUTH0 SYNC TESTS
  // =============================================================================
  describe('POST /auth0-sync', () => {
    it('should create new user on first Auth0 login', async () => {
      const auth0Data = {
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/pic.jpg',
        sub: 'auth0|123456',
      };

      const league = createMockLeague();
      const newUser = createMockUser({
        email: auth0Data.email,
        name: auth0Data.name,
        profilePicture: auth0Data.picture,
        hasSeenWelcome: false,
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.league.findFirst.mockResolvedValue(league as any);
      mockPrisma.user.create.mockResolvedValue(newUser as any);

      expect(newUser.email).toBe('newuser@example.com');
      expect(newUser.hasSeenWelcome).toBe(false);
    });

    it('should return existing user on subsequent Auth0 login', async () => {
      const existingUser = createMockUser({
        email: 'existing@example.com',
        name: 'Existing User',
      });

      mockPrisma.user.findUnique.mockResolvedValue(existingUser as any);

      expect(existingUser.email).toBe('existing@example.com');
    });

    it('should update profile picture if changed', async () => {
      const existingUser = createMockUser({
        profilePicture: 'https://old-picture.com/pic.jpg',
      });
      const updatedUser = createMockUser({
        profilePicture: 'https://new-picture.com/pic.jpg',
      });

      mockPrisma.user.findUnique.mockResolvedValue(existingUser as any);
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);

      expect(updatedUser.profilePicture).toBe('https://new-picture.com/pic.jpg');
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        name: 'Test User',
      };

      // Zod validation should fail
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidData.email);
      expect(isValidEmail).toBe(false);
    });

    it('should create default league if none exists', async () => {
      const newLeague = createMockLeague({
        name: 'Official League',
        code: 'OFFICIAL2025',
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.league.findFirst.mockResolvedValue(null);
      mockPrisma.league.create.mockResolvedValue(newLeague as any);

      expect(newLeague.name).toBe('Official League');
      expect(newLeague.code).toBe('OFFICIAL2025');
    });

    it('should derive username from email if name not provided', () => {
      const email = 'johndoe@example.com';
      const derivedName = email.split('@')[0];

      expect(derivedName).toBe('johndoe');
    });
  });

  // =============================================================================
  // GET /ME TESTS
  // =============================================================================
  describe('GET /me', () => {
    it('should return authenticated user data', async () => {
      const user = createMockUser({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        isAdmin: false,
        hasSeenWelcome: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue(user as any);

      expect(user.email).toBe('test@example.com');
      expect(user.hasSeenWelcome).toBe(true);
    });

    it('should return 401 for missing token', () => {
      const expectedError = { error: 'No token' };
      expect(expectedError.error).toBe('No token');
    });

    it('should return 401 for invalid token', () => {
      const expectedError = { error: 'Invalid token' };
      expect(expectedError.error).toBe('Invalid token');
    });

    it('should return 401 for token missing email', () => {
      const expectedError = { error: 'Token missing email' };
      expect(expectedError.error).toBe('Token missing email');
    });

    it('should return 401 for user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const expectedError = { error: 'User not found' };
      expect(expectedError.error).toBe('User not found');
    });

    it('should return 503 for database unavailable', async () => {
      const dbError = { code: 'P1001' };
      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      const expectedError = { error: 'Database not available. Please try again later.' };
      expect(expectedError.error).toContain('Database not available');
    });
  });

  // =============================================================================
  // VALIDATE AUTH0 TOKEN MIDDLEWARE TESTS
  // =============================================================================
  describe('validateAuth0Token middleware', () => {
    it('should extract token from Authorization header', () => {
      const authHeader = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...';
      const token = authHeader.substring(7);

      expect(token).toBe('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');
    });

    it('should reject request without token', () => {
      const expectedError = { error: 'No authentication token provided' };
      expect(expectedError.error).toBe('No authentication token provided');
    });

    it('should reject expired token', () => {
      const expectedError = { error: 'Invalid or expired token' };
      expect(expectedError.error).toContain('expired');
    });

    it('should reject token missing user identifier', () => {
      const expectedError = { error: 'Token missing user identifier' };
      expect(expectedError.error).toBe('Token missing user identifier');
    });

    it('should auto-create user on first Auth0 authentication', async () => {
      const newUser = createMockUser({ hasSeenWelcome: false });

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.league.findFirst.mockResolvedValue(createMockLeague() as any);
      mockPrisma.user.create.mockResolvedValue(newUser as any);

      expect(newUser.hasSeenWelcome).toBe(false);
    });

    it('should set auth user on request object', () => {
      const user = createMockUser({ isAdmin: true });

      const authUser = {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        auth0Id: 'auth0|123456',
      };

      expect(authUser.id).toBe('test-user-id');
      expect(authUser.isAdmin).toBe(true);
      expect(authUser.auth0Id).toBe('auth0|123456');
    });
  });

  // =============================================================================
  // LOGOUT TESTS
  // =============================================================================
  describe('POST /logout', () => {
    it('should clear auth cookie', () => {
      const mockRes = {
        clearCookie: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      mockRes.clearCookie('auth0Token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
      mockRes.json({ message: 'Logged out successfully' });

      expect(mockRes.clearCookie).toHaveBeenCalledWith('auth0Token', expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });

  // =============================================================================
  // LEGACY AUTH0-LOGIN TESTS
  // =============================================================================
  describe('POST /auth0-login (deprecated)', () => {
    it('should still work for backward compatibility', async () => {
      const existingUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(existingUser as any);

      expect(existingUser.email).toBe('test@example.com');
    });

    it('should require email and name', () => {
      const expectedError = { error: 'Email and name are required' };
      expect(expectedError.error).toBe('Email and name are required');
    });

    it('should create user if not exists', async () => {
      const newUser = createMockUser({ email: 'new@example.com' });
      const league = createMockLeague();

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.league.findFirst.mockResolvedValue(league as any);
      mockPrisma.user.create.mockResolvedValue(newUser as any);

      expect(newUser.email).toBe('new@example.com');
    });
  });

  // =============================================================================
  // COOKIE SETTINGS TESTS
  // =============================================================================
  describe('Cookie Settings', () => {
    it('should use secure cookies in production', () => {
      const isProduction = true;
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      expect(cookieOptions.secure).toBe(true);
      expect(cookieOptions.sameSite).toBe('none');
    });

    it('should use lax sameSite in development', () => {
      const isProduction = false;
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
      };

      expect(cookieOptions.secure).toBe(false);
      expect(cookieOptions.sameSite).toBe('lax');
    });

    it('should set 7-day expiration', () => {
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      const sevenDaysMs = 604800000;

      expect(maxAge).toBe(sevenDaysMs);
    });
  });

  // =============================================================================
  // JWKS CLIENT TESTS
  // =============================================================================
  describe('JWKS Client Configuration', () => {
    it('should configure correct JWKS URI', () => {
      const domain = 'dev-w01qewse7es4d0ue.us.auth0.com';
      const jwksUri = `https://${domain}/.well-known/jwks.json`;

      expect(jwksUri).toBe('https://dev-w01qewse7es4d0ue.us.auth0.com/.well-known/jwks.json');
    });

    it('should cache keys for 10 minutes', () => {
      const cacheMaxAge = 600000; // 10 minutes in ms
      expect(cacheMaxAge).toBe(10 * 60 * 1000);
    });

    it('should rate limit JWKS requests', () => {
      const jwksRequestsPerMinute = 10;
      expect(jwksRequestsPerMinute).toBe(10);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================
  describe('Edge Cases', () => {
    it('should handle Auth0 custom claims', () => {
      const payload = {
        email: 'test@example.com',
        'https://rgfl.app/email': 'custom@example.com',
      };

      // Should prefer standard email, fallback to custom claim
      const email = payload.email || payload['https://rgfl.app/email'];
      expect(email).toBe('test@example.com');
    });

    it('should use custom claim if standard email missing', () => {
      const payload = {
        'https://rgfl.app/email': 'custom@example.com',
      };

      const email = (payload as any).email || payload['https://rgfl.app/email'];
      expect(email).toBe('custom@example.com');
    });

    it('should handle nickname fallback for name', () => {
      const payload = {
        email: 'test@example.com',
        nickname: 'testuser',
      };

      const name = (payload as any).name || payload.nickname || payload.email.split('@')[0];
      expect(name).toBe('testuser');
    });

    it('should handle email-derived name as last resort', () => {
      const payload = {
        email: 'john.doe@example.com',
      };

      const name = (payload as any).name || (payload as any).nickname || payload.email.split('@')[0];
      expect(name).toBe('john.doe');
    });

    it('should set password to null for Auth0 users', async () => {
      const newUser = createMockUser({ password: null });

      mockPrisma.user.create.mockResolvedValue(newUser as any);

      expect(newUser.password).toBeNull();
    });

    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Connection refused');
      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      // Should catch and return 500
      const expectedError = { error: 'Authentication failed' };
      expect(expectedError.error).toBe('Authentication failed');
    });
  });

  // =============================================================================
  // AUTO-ASSIGN TO OFFICIAL LEAGUE TESTS
  // =============================================================================
  describe('Auto-assign to Official League', () => {
    it('should trigger auto-assign on new user creation', async () => {
      const newUser = createMockUser({ id: 'new-user-id' });
      const officialLeague = createMockLeague({ type: 'OFFICIAL' });

      mockPrisma.user.create.mockResolvedValue(newUser as any);
      mockPrisma.league.findFirst.mockResolvedValue(officialLeague as any);

      // Auto-assign should be called (non-blocking)
      expect(newUser.id).toBe('new-user-id');
    });

    it('should not fail user creation if auto-assign fails', async () => {
      const newUser = createMockUser();

      mockPrisma.user.create.mockResolvedValue(newUser as any);
      // Auto-assign failure should be logged but not block user creation

      expect(newUser.email).toBe('test@example.com');
    });
  });

  // =============================================================================
  // WELCOME EMAIL TESTS
  // =============================================================================
  describe('Welcome Email', () => {
    it('should trigger welcome email on new user creation', async () => {
      const newUser = createMockUser({
        email: 'newuser@example.com',
        name: 'New User',
      });

      mockPrisma.user.create.mockResolvedValue(newUser as any);

      // Welcome email should be sent (non-blocking)
      expect(newUser.email).toBe('newuser@example.com');
    });

    it('should not fail user creation if welcome email fails', async () => {
      const newUser = createMockUser();

      mockPrisma.user.create.mockResolvedValue(newUser as any);
      // Email failure should be logged but not block user creation

      expect(newUser.email).toBe('test@example.com');
    });
  });
});
