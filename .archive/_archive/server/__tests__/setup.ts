/**
 * Vitest test setup for server-side tests
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
process.env.AUTH0_DOMAIN = 'test.us.auth0.com';
process.env.AUTH0_AUDIENCE = 'https://test-api';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock Prisma client
vi.mock('../prisma.js', () => ({
  default: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((fn) => fn({
      user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      league: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      leagueMembership: { findFirst: vi.fn(), create: vi.fn() },
      season: { findFirst: vi.fn() },
      castaway: { findMany: vi.fn() },
      pick: { findMany: vi.fn(), create: vi.fn() },
      score: { findMany: vi.fn() },
      ranking: { findFirst: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
      rankingEntry: { deleteMany: vi.fn(), createMany: vi.fn() },
      draftPick: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    })),
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    league: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    leagueMembership: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    season: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    castaway: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pick: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    ranking: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    rankingEntry: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    draftPick: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    week: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    weeklyResult: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    score: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      groupBy: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    charityPayout: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
  return {
    default: vi.fn(() => mockStripe),
  };
});

// Mock logger
vi.mock('../logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  logError: vi.fn(),
}));

// Global test lifecycle hooks
beforeAll(() => {
  // Setup before all tests
});

afterAll(() => {
  // Cleanup after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  isAdmin: false,
  ...overrides,
});

export const createMockLeague = (overrides = {}) => ({
  id: 'test-league-id',
  name: 'Test League',
  code: 'TEST123',
  type: 'OFFICIAL' as const,
  status: 'OPEN' as const,
  maxPlayers: 18,
  currentPlayers: 0,
  picksPerUser: 2,
  draftStatus: 'PENDING' as const,
  ...overrides,
});

export const createMockCastaway = (overrides = {}) => ({
  id: 'test-castaway-id',
  name: 'Test Castaway',
  tribe: 'Test Tribe',
  eliminated: false,
  eliminatedWeek: null,
  ...overrides,
});

export const createMockSeason = (overrides = {}) => ({
  id: 'test-season-id',
  number: 47,
  name: 'Season 47',
  isActive: true,
  ...overrides,
});

export const createMockPayment = (overrides = {}) => ({
  id: 'test-payment-id',
  userId: 'test-user-id',
  leagueId: 'test-league-id',
  amount: 25.00,
  stripePaymentId: 'pi_test_123',
  stripeSessionId: 'cs_test_123',
  status: 'PENDING' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCharityPayout = (overrides = {}) => ({
  id: 'test-payout-id',
  leagueId: 'test-league-id',
  winnerUserId: 'test-winner-id',
  charityName: 'Test Charity',
  charityUrl: 'https://test-charity.org',
  amount: 100.00,
  payoutStatus: 'PENDING' as const,
  paidAt: null,
  paidBy: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockStripeSession = (overrides = {}) => ({
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/test',
  payment_status: 'paid',
  payment_intent: 'pi_test_123',
  metadata: {
    userId: 'test-user-id',
    leagueId: 'test-league-id',
    leagueCode: 'TEST123',
    charityEnabled: 'false',
  },
  ...overrides,
});

export const createMockRequest = (overrides = {}) => ({
  user: createMockUser(),
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  return res;
};
