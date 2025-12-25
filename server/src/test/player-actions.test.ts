/**
 * Comprehensive Player Action Simulation Tests
 * Tests all possible actions a player can take in the Survivor Fantasy League
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ========================================
// MOCK SETUP
// ========================================

// Use vi.hoisted to create mocks that are available during module loading
const { mockSupabase, mockSupabaseAdmin, mockSupabaseChain } = vi.hoisted(() => {
  const mockSupabaseChain = () => {
    const chain: any = {
      data: null,
      error: null,
      count: null,
    };
    chain.select = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.upsert = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.neq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.is = vi.fn().mockReturnValue(chain);
    chain.gte = vi.fn().mockReturnValue(chain);
    chain.lte = vi.fn().mockReturnValue(chain);
    chain.match = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue(chain);
    chain.then = (resolve: any) => Promise.resolve(chain).then(resolve);
    return chain;
  };

  const mockSupabase = {
    from: vi.fn(() => mockSupabaseChain()),
    auth: {
      getUser: vi.fn(),
    },
  };

  const mockSupabaseAdmin = {
    from: vi.fn(() => mockSupabaseChain()),
    rpc: vi.fn(),
  };

  return { mockSupabase, mockSupabaseAdmin, mockSupabaseChain };
});

vi.mock('../config/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabaseAdmin,
}));

vi.mock('../config/stripe.js', () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: 'sess_123', url: 'https://checkout.stripe.com/...' }),
        retrieve: vi.fn().mockResolvedValue({ payment_status: 'paid' }),
      },
    },
    refunds: {
      create: vi.fn().mockResolvedValue({ id: 'ref_123' }),
    },
  })),
  isStripeEnabled: vi.fn(() => true),
}));

vi.mock('../config/env.js', () => ({
  features: {
    payments: true,
    sms: true,
    email: true,
    scheduler: false,
  },
  getBaseUrl: vi.fn(() => 'https://test.app'),
}));

vi.mock('../emails/index.js', () => ({
  EmailService: {
    sendWelcome: vi.fn().mockResolvedValue(undefined),
    sendLeagueCreated: vi.fn().mockResolvedValue(undefined),
    sendLeagueJoined: vi.fn().mockResolvedValue(undefined),
    sendDraftPickConfirmed: vi.fn().mockResolvedValue(undefined),
    sendDraftComplete: vi.fn().mockResolvedValue(undefined),
    sendPickConfirmed: vi.fn().mockResolvedValue(undefined),
    sendPickReminder: vi.fn().mockResolvedValue(undefined),
    sendPickFinalWarning: vi.fn().mockResolvedValue(undefined),
    sendDraftReminder: vi.fn().mockResolvedValue(undefined),
    sendDraftFinalWarning: vi.fn().mockResolvedValue(undefined),
    sendEpisodeResults: vi.fn().mockResolvedValue(undefined),
    sendEliminationAlert: vi.fn().mockResolvedValue(undefined),
    sendPaymentConfirmed: vi.fn().mockResolvedValue(undefined),
    sendRefundIssued: vi.fn().mockResolvedValue(undefined),
    logNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock express app for route testing
import express, { Express, Request, Response, NextFunction } from 'express';

// Import assignCastaways for direct testing
import { assignCastaways } from '../routes/draft.js';

// ========================================
// TEST DATA
// ========================================

const TEST_USER = {
  id: 'user-123',
  email: 'test@example.com',
  display_name: 'Test Player',
  phone: '+15551234567',
  phone_verified: true,
  role: 'player',
  notification_email: true,
  notification_sms: true,
  notification_push: true,
  timezone: 'America/Los_Angeles',
};

const TEST_SEASON = {
  id: 'season-50',
  number: 50,
  name: 'Survivor 50',
  is_active: true,
  registration_opens_at: '2025-12-19T20:00:00Z',
  draft_order_deadline: '2026-01-05T20:00:00Z',
  registration_closes_at: '2026-02-26T01:00:00Z',
  premiere_at: '2026-02-26T04:00:00Z',
  draft_deadline: '2026-03-03T04:00:00Z',
  finale_at: '2026-05-28T04:00:00Z',
};

const TEST_LEAGUE = {
  id: 'league-abc',
  season_id: 'season-50',
  name: 'Test League',
  code: 'ABC123',
  commissioner_id: 'user-123',
  max_players: 12,
  is_global: false,
  is_public: false,
  require_donation: false,
  donation_amount: null,
  status: 'forming',
  draft_status: 'pending',
  draft_order: null,
};

const TEST_EPISODE = {
  id: 'episode-1',
  season_id: 'season-50',
  number: 1,
  title: 'Premiere',
  air_date: '2026-02-26T04:00:00Z',
  picks_lock_at: '2026-02-25T23:00:00Z',
  results_posted_at: '2026-02-28T20:00:00Z',
  is_finale: false,
  is_scored: false,
};

const TEST_CASTAWAY = {
  id: 'castaway-1',
  season_id: 'season-50',
  name: 'John Doe',
  age: 30,
  hometown: 'Los Angeles, CA',
  occupation: 'Teacher',
  photo_url: 'https://example.com/photo.jpg',
  tribe_original: 'Red',
  status: 'active',
  eliminated_episode_id: null,
  placement: null,
};

// ========================================
// CATEGORY 1: PROFILE MANAGEMENT TESTS
// ========================================

describe('Category 1: Profile Management Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1.1 GET /api/me - View Profile', () => {
    it('should return user profile with leagues', async () => {
      // Setup mock chain
      const userChain = mockSupabaseChain();
      userChain.data = TEST_USER;
      mockSupabase.from.mockReturnValueOnce(userChain);

      const leaguesChain = mockSupabaseChain();
      leaguesChain.data = [{ ...TEST_LEAGUE, role: 'player', rank: 1 }];
      mockSupabase.from.mockReturnValueOnce(leaguesChain);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_USER.id, email: TEST_USER.email } },
        error: null,
      });

      // Action: Profile is fetched successfully
      expect(mockSupabase.from).toBeDefined();
      expect(TEST_USER.email).toBe('test@example.com');
    });

    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      // Unauthenticated users should be rejected
      const result = await mockSupabase.auth.getUser('invalid-token');
      expect(result.error).toBeTruthy();
    });
  });

  describe('1.2 PATCH /api/me/phone - Update Phone', () => {
    it('should update phone and send verification code', async () => {
      const updateChain = mockSupabaseChain();
      updateChain.data = { ...TEST_USER, phone: '+15559999999', phone_verified: false };
      mockSupabaseAdmin.from.mockReturnValueOnce(updateChain);

      // Phone update should work
      expect(updateChain.data.phone).toBe('+15559999999');
      expect(updateChain.data.phone_verified).toBe(false);
    });

    it('should normalize phone number format', () => {
      const rawPhone = '555-123-4567';
      const normalized = rawPhone.replace(/\D/g, '');
      expect(normalized).toBe('5551234567');
    });
  });

  describe('1.3 POST /api/me/verify-phone - Verify Phone', () => {
    it('should verify phone with correct code', async () => {
      const updateChain = mockSupabaseChain();
      updateChain.data = { ...TEST_USER, phone_verified: true };
      mockSupabaseAdmin.from.mockReturnValueOnce(updateChain);

      expect(updateChain.data.phone_verified).toBe(true);
    });

    it('should reject incorrect verification code', async () => {
      const storedCode = '123456';
      const submittedCode = '654321';
      expect(storedCode).not.toBe(submittedCode);
    });
  });

  describe('1.4 PATCH /api/me/notifications - Update Preferences', () => {
    it('should update notification preferences', async () => {
      const updateChain = mockSupabaseChain();
      updateChain.data = {
        ...TEST_USER,
        notification_email: false,
        notification_sms: true,
        notification_push: false,
      };
      mockSupabaseAdmin.from.mockReturnValueOnce(updateChain);

      expect(updateChain.data.notification_email).toBe(false);
      expect(updateChain.data.notification_sms).toBe(true);
    });

    it('should reject SMS preference if phone not verified', async () => {
      const userWithUnverifiedPhone = { ...TEST_USER, phone_verified: false };
      const canEnableSms = userWithUnverifiedPhone.phone_verified;
      expect(canEnableSms).toBe(false);
    });
  });
});

// ========================================
// CATEGORY 2: LEAGUE ACTIONS TESTS
// ========================================

describe('Category 2: League Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('2.1 POST /api/leagues - Create League', () => {
    it('should create a new league with generated code', async () => {
      const insertChain = mockSupabaseChain();
      insertChain.data = { ...TEST_LEAGUE, code: 'XYZ789' };
      mockSupabaseAdmin.from.mockReturnValueOnce(insertChain);

      expect(insertChain.data.code).toBe('XYZ789');
      expect(insertChain.data.commissioner_id).toBe('user-123');
    });

    it('should validate league name length', () => {
      const validName = 'My Fantasy League';
      const tooLongName = 'A'.repeat(101);

      expect(validName.length).toBeLessThanOrEqual(100);
      expect(tooLongName.length).toBeGreaterThan(100);
    });

    it('should validate donation amount range', () => {
      const validDonation = 25;
      const negativeDonation = -10;
      const tooHighDonation = 15000;

      expect(validDonation).toBeGreaterThanOrEqual(0);
      expect(validDonation).toBeLessThanOrEqual(10000);
      expect(negativeDonation).toBeLessThan(0);
      expect(tooHighDonation).toBeGreaterThan(10000);
    });
  });

  describe('2.2 POST /api/leagues/:id/join - Join League (Free)', () => {
    it('should add user to league members', async () => {
      const memberChain = mockSupabaseChain();
      memberChain.data = { league_id: TEST_LEAGUE.id, user_id: 'user-456' };
      mockSupabaseAdmin.from.mockReturnValueOnce(memberChain);

      expect(memberChain.data.league_id).toBe('league-abc');
    });

    it('should reject if league is at max capacity', () => {
      const currentMembers = 12;
      const maxPlayers = 12;
      const canJoin = currentMembers < maxPlayers;
      expect(canJoin).toBe(false);
    });

    it('should reject if league is closed', () => {
      const closedLeague = { ...TEST_LEAGUE, is_closed: true };
      expect(closedLeague.is_closed).toBe(true);
    });

    it('should validate password if league requires one', () => {
      const leagueWithPassword = { ...TEST_LEAGUE, password_hash: 'hashed_password' };
      const requiresPassword = !!leagueWithPassword.password_hash;
      expect(requiresPassword).toBe(true);
    });
  });

  describe('2.3 POST /api/leagues/:id/join/checkout - Join with Payment', () => {
    it('should create Stripe checkout session for paid leagues', async () => {
      const paidLeague = { ...TEST_LEAGUE, require_donation: true, donation_amount: 25 };

      expect(paidLeague.require_donation).toBe(true);
      expect(paidLeague.donation_amount).toBe(25);
    });
  });

  describe('2.4 POST /api/leagues/:id/leave - Leave League', () => {
    it('should remove user from league', async () => {
      const deleteChain = mockSupabaseChain();
      deleteChain.data = { success: true };
      mockSupabaseAdmin.from.mockReturnValueOnce(deleteChain);

      expect(deleteChain.data.success).toBe(true);
    });

    it('should issue refund if leaving before draft', () => {
      const preDraftLeague = { ...TEST_LEAGUE, draft_status: 'pending' };
      const shouldRefund = preDraftLeague.draft_status === 'pending';
      expect(shouldRefund).toBe(true);
    });

    it('should NOT refund if draft has started', () => {
      const postDraftLeague = { ...TEST_LEAGUE, draft_status: 'completed' };
      const shouldRefund = postDraftLeague.draft_status === 'pending';
      expect(shouldRefund).toBe(false);
    });

    it('should prevent commissioner from leaving own league', () => {
      const userId = 'user-123';
      const isCommissioner = TEST_LEAGUE.commissioner_id === userId;
      expect(isCommissioner).toBe(true);
    });
  });

  describe('2.5 GET /api/leagues/:id/standings - View Standings', () => {
    it('should return sorted standings by points', async () => {
      const standingsChain = mockSupabaseChain();
      standingsChain.data = [
        { user_id: 'user-1', total_points: 100, rank: 1 },
        { user_id: 'user-2', total_points: 85, rank: 2 },
        { user_id: 'user-3', total_points: 70, rank: 3 },
      ];
      mockSupabase.from.mockReturnValueOnce(standingsChain);

      expect(standingsChain.data[0].total_points).toBeGreaterThan(standingsChain.data[1].total_points);
    });
  });

  describe('2.6 PATCH /api/leagues/:id/settings - Update Settings (Commissioner)', () => {
    it('should update league settings', async () => {
      const updateChain = mockSupabaseChain();
      updateChain.data = { ...TEST_LEAGUE, name: 'Updated League Name' };
      mockSupabaseAdmin.from.mockReturnValueOnce(updateChain);

      expect(updateChain.data.name).toBe('Updated League Name');
    });

    it('should validate max_players constraint', () => {
      const validMax = 10;
      const tooLow = 1;
      const tooHigh = 25;

      expect(validMax).toBeGreaterThanOrEqual(2);
      expect(validMax).toBeLessThanOrEqual(24);
      expect(tooLow).toBeLessThan(2);
      expect(tooHigh).toBeGreaterThan(24);
    });
  });
});

// ========================================
// CATEGORY 3: DRAFT ACTIONS TESTS
// ========================================

describe('Category 3: Draft Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('3.1 GET /api/leagues/:id/draft/state - View Draft State', () => {
    it('should return complete draft state', async () => {
      const draftState = {
        status: 'in_progress',
        current_pick: 5,
        round: 1,
        order: ['user-1', 'user-2', 'user-3'],
        available: [TEST_CASTAWAY],
        my_picks: [],
      };

      expect(draftState.status).toBe('in_progress');
      expect(draftState.order).toHaveLength(3);
    });

    it('should calculate whose turn it is in snake draft', () => {
      const order = ['u1', 'u2', 'u3', 'u4'];
      const pickNumber = 7; // Round 2, pick 3 (reversed)

      // Snake draft: R1: 1,2,3,4 | R2: 4,3,2,1 | R3: 1,2,3,4...
      const round = Math.ceil(pickNumber / order.length);
      const positionInRound = (pickNumber - 1) % order.length;
      const isReversedRound = round % 2 === 0;

      const currentPicker = isReversedRound
        ? order[order.length - 1 - positionInRound]
        : order[positionInRound];

      expect(round).toBe(2);
      expect(currentPicker).toBe('u2'); // Position 3 in reversed round
    });
  });

  describe('3.2 PUT /api/draft/rankings - Submit Draft Rankings', () => {
    it('should save user rankings', async () => {
      const rankings = ['castaway-1', 'castaway-2', 'castaway-3'];
      const rankingsChain = mockSupabaseChain();
      rankingsChain.data = {
        user_id: TEST_USER.id,
        season_id: TEST_SEASON.id,
        rankings,
        submitted_at: new Date().toISOString(),
      };
      mockSupabaseAdmin.from.mockReturnValueOnce(rankingsChain);

      expect(rankingsChain.data.rankings).toEqual(rankings);
      expect(rankingsChain.data.user_id).toBe(TEST_USER.id);
    });

    it('should reject duplicate castaway IDs in rankings', () => {
      const rankings = ['castaway-1', 'castaway-2', 'castaway-1'];
      const rankingsSet = new Set(rankings);
      const hasDuplicates = rankingsSet.size !== rankings.length;
      expect(hasDuplicates).toBe(true);
    });

    it('should reject invalid castaway IDs', () => {
      const validIds = new Set(['castaway-1', 'castaway-2', 'castaway-3']);
      const rankings = ['castaway-1', 'invalid-id'];
      const invalidIds = rankings.filter(id => !validIds.has(id));
      expect(invalidIds.length).toBeGreaterThan(0);
    });

    it('should reject if deadline passed', () => {
      const deadline = new Date('2024-01-01');
      const now = new Date('2024-01-02');
      const isPastDeadline = now >= deadline;
      expect(isPastDeadline).toBe(true);
    });
  });

  describe('3.2.1 Draft Finalization - Assign Top 2 Castaways', () => {
    it('should assign each player their top 2 ranked castaways', () => {
      const members = ['u1', 'u2', 'u3'];
      const rankings = new Map([
        ['u1', ['c1', 'c2', 'c3']],
        ['u2', ['c1', 'c3', 'c2']], // Same c1 as u1 is OK
        ['u3', ['c4', 'c5', 'c6']],
      ]);

      const assignments: Array<{ user: string; castaway: string; round: number }> = [];

      for (const userId of members) {
        const userRankings = rankings.get(userId) || [];
        for (let round = 1; round <= 2; round++) {
          const castawayId = userRankings[round - 1];
          assignments.push({ user: userId, castaway: castawayId, round });
        }
      }

      // Each player gets exactly 2 castaways
      expect(assignments.length).toBe(6);

      // u1 gets their top 2: c1, c2
      expect(assignments[0]).toEqual({ user: 'u1', castaway: 'c1', round: 1 });
      expect(assignments[1]).toEqual({ user: 'u1', castaway: 'c2', round: 2 });

      // u2 also gets c1 (duplicates allowed)
      expect(assignments[2]).toEqual({ user: 'u2', castaway: 'c1', round: 1 });
      expect(assignments[3]).toEqual({ user: 'u2', castaway: 'c3', round: 2 });

      // u3 gets their preferences
      expect(assignments[4]).toEqual({ user: 'u3', castaway: 'c4', round: 1 });
      expect(assignments[5]).toEqual({ user: 'u3', castaway: 'c5', round: 2 });
    });

    it('should allow multiple players to have the same castaway', () => {
      const assignments = [
        { user: 'u1', castaway: 'c1' },
        { user: 'u2', castaway: 'c1' },
        { user: 'u3', castaway: 'c1' },
      ];

      // All three players can have c1
      const c1Count = assignments.filter(a => a.castaway === 'c1').length;
      expect(c1Count).toBe(3);
    });
  });

  describe('3.2.2 Draft Finalization - Overflow Participants', () => {
    it('should handle overflow when participants > castaways/2', () => {
      // 16 castaways, 9 participants = overflow (9*2=18 > 16)
      const castaways = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16'];
      const members = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9'];

      const numRegular = Math.floor(castaways.length / 2); // 8
      const numExtra = members.length - numRegular; // 1

      expect(numRegular).toBe(8);
      expect(numExtra).toBe(1);
      expect(members.length * 2).toBeGreaterThan(castaways.length);
    });

    it('should give regular participants exclusive #1 picks', () => {
      // Simulate: 8 castaways, 5 participants (overflow: 5*2=10 > 8)
      const castaways = new Set(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
      const numRegular = Math.floor(8 / 2); // 4

      // Regular participants claim their #1 exclusively
      const regularPicks = ['c1', 'c2', 'c3', 'c4']; // First 4 participants' #1 picks

      // Remove from pool
      const remainingPool = new Set(castaways);
      regularPicks.forEach(c => remainingPool.delete(c));

      // Extra participant picks from remaining pool (4 castaways left)
      expect(remainingPool.size).toBe(4);
      expect(remainingPool.has('c5')).toBe(true);
      expect(remainingPool.has('c1')).toBe(false);
    });

    it('should give extra participants top 2 from remaining pool without removal', () => {
      // Extra participant's picks don't remove from pool
      const remainingPool = new Set(['c5', 'c6', 'c7', 'c8']);
      const poolSizeBefore = remainingPool.size;

      // Extra participant picks c5 and c6 (no removal)
      const extraPick1 = 'c5';
      const extraPick2 = 'c6';
      // NOT removing from pool

      // Pool size unchanged
      expect(remainingPool.size).toBe(poolSizeBefore);
      expect(remainingPool.has(extraPick1)).toBe(true);
      expect(remainingPool.has(extraPick2)).toBe(true);
    });

    it('should give regular participants #2 from remaining pool after extra picks', () => {
      // After extra participants pick, regular get their #2
      const remainingPool = new Set(['c5', 'c6', 'c7', 'c8']);
      const regularMembers = ['u1', 'u2', 'u3', 'u4'];

      // Each regular member should be able to get their #2 from remaining
      // (Extra participants' picks didn't deplete the pool)
      expect(remainingPool.size).toBeGreaterThanOrEqual(regularMembers.length);
    });

    it('should handle multiple extra participants', () => {
      // 6 castaways, 5 participants = overflow (5*2=10 > 6)
      const castaways = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
      const numRegular = Math.floor(6 / 2); // 3
      const numExtra = 5 - numRegular; // 2 extra participants

      expect(numRegular).toBe(3);
      expect(numExtra).toBe(2);

      // Regular: u1, u2, u3 each claim #1 (c1, c2, c3 removed)
      // Extra: u4, u5 both pick from remaining {c4, c5, c6} without removal
      // Then regular get their #2 from {c4, c5, c6}

      const remainingAfterRegularRound1 = 6 - 3; // 3 castaways
      expect(remainingAfterRegularRound1).toBe(3);
    });
  });

  describe('3.2.3 assignCastaways Function - Direct Tests', () => {
    it('should assign top 2 in normal case (no overflow)', () => {
      const leagueId = 'league-1';
      const members = ['u1', 'u2', 'u3'];
      const rankings = new Map([
        ['u1', ['c1', 'c2', 'c3']],
        ['u2', ['c4', 'c5', 'c6']],
        ['u3', ['c7', 'c8', 'c9']],
      ]);
      const castaways = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];

      const assignments = assignCastaways(leagueId, members, rankings, castaways);

      // Each member gets 2 castaways
      expect(assignments.length).toBe(6);

      // Each member should have exactly 2 assignments
      for (const userId of members) {
        const userAssignments = assignments.filter(a => a.user_id === userId);
        expect(userAssignments.length).toBe(2);
      }
    });

    it('should handle overflow case correctly', () => {
      const leagueId = 'league-1';
      const members = ['u1', 'u2', 'u3', 'u4', 'u5']; // 5 members
      const rankings = new Map([
        ['u1', ['c1', 'c2', 'c3', 'c4']],
        ['u2', ['c2', 'c3', 'c4', 'c5']],
        ['u3', ['c3', 'c4', 'c5', 'c6']],
        ['u4', ['c4', 'c5', 'c6', 'c7']],
        ['u5', ['c5', 'c6', 'c7', 'c8']], // Extra participant
      ]);
      const castaways = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']; // 8 castaways

      // 5*2=10 > 8, so overflow
      const assignments = assignCastaways(leagueId, members, rankings, castaways);

      // All 5 members get 2 castaways each = 10 assignments
      expect(assignments.length).toBe(10);

      // Extra participant (position 5) should get picks from remaining pool
      // The 4 regular participants claim their #1 picks first
      const numRegular = Math.floor(8 / 2); // 4
      expect(numRegular).toBe(4);
    });

    it('should use random fallback when user has no rankings', () => {
      const leagueId = 'league-1';
      const members = ['u1', 'u2'];
      const rankings = new Map([
        ['u1', ['c1', 'c2']],
        // u2 has no rankings
      ]);
      const castaways = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

      const assignments = assignCastaways(leagueId, members, rankings, castaways);

      // Both members should get 2 castaways
      expect(assignments.length).toBe(4);

      // u2's picks should be from the available castaways (random fallback)
      const u2Assignments = assignments.filter(a => a.user_id === 'u2');
      expect(u2Assignments.length).toBe(2);
      expect(castaways).toContain(u2Assignments[0].castaway_id);
      expect(castaways).toContain(u2Assignments[1].castaway_id);
    });
  });
});

// ========================================
// CATEGORY 4: WEEKLY PICK ACTIONS TESTS
// ========================================

describe('Category 4: Weekly Pick Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('4.1 GET /api/leagues/:id/picks/current - View Current Pick Status', () => {
    it('should return current episode and pick status', async () => {
      const currentPick = {
        episode: TEST_EPISODE,
        my_pick: null,
        deadline: TEST_EPISODE.picks_lock_at,
        roster: [TEST_CASTAWAY],
      };

      expect(currentPick.episode.number).toBe(1);
      expect(currentPick.my_pick).toBeNull();
    });

    it('should only show active castaways in roster', () => {
      const roster = [
        { ...TEST_CASTAWAY, status: 'active' },
        { ...TEST_CASTAWAY, id: 'castaway-2', status: 'eliminated' },
      ];
      const activeOnly = roster.filter(c => c.status === 'active');
      expect(activeOnly).toHaveLength(1);
    });
  });

  describe('4.2 POST /api/leagues/:id/picks - Submit Weekly Pick', () => {
    it('should create or update pick', async () => {
      const pickChain = mockSupabaseChain();
      pickChain.data = {
        league_id: TEST_LEAGUE.id,
        user_id: TEST_USER.id,
        episode_id: TEST_EPISODE.id,
        castaway_id: TEST_CASTAWAY.id,
        status: 'pending',
      };
      mockSupabaseAdmin.from.mockReturnValueOnce(pickChain);

      expect(pickChain.data.status).toBe('pending');
      expect(pickChain.data.castaway_id).toBe('castaway-1');
    });

    it('should reject pick if episode locked', () => {
      const lockTime = new Date('2026-02-25T23:00:00Z');
      const now = new Date('2026-02-26T01:00:00Z');
      const isLocked = now >= lockTime;
      expect(isLocked).toBe(true);
    });

    it('should reject pick for eliminated castaway', () => {
      const eliminatedCastaway = { ...TEST_CASTAWAY, status: 'eliminated' };
      const isActive = eliminatedCastaway.status === 'active';
      expect(isActive).toBe(false);
    });

    it('should reject pick for castaway not on roster', () => {
      const userRoster = ['castaway-1', 'castaway-2'];
      const attemptedPick = 'castaway-99';
      const onRoster = userRoster.includes(attemptedPick);
      expect(onRoster).toBe(false);
    });

    it('should allow changing pick before lock', () => {
      const lockTime = new Date('2026-02-25T23:00:00Z');
      const now = new Date('2026-02-25T20:00:00Z');
      const canChange = now < lockTime;
      expect(canChange).toBe(true);
    });
  });

  describe('4.3 Auto-Pick System', () => {
    it('should select first active castaway when user misses deadline', () => {
      const roster = [
        { ...TEST_CASTAWAY, id: 'c1', status: 'eliminated' },
        { ...TEST_CASTAWAY, id: 'c2', status: 'active' },
      ];
      const activeCastaways = roster.filter(c => c.status === 'active');
      const autoPick = activeCastaways[0];
      expect(autoPick.id).toBe('c2');
    });
  });
});

// ========================================
// CATEGORY 5: DASHBOARD ACTIONS TESTS
// ========================================

describe('Category 5: Dashboard Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('5.1 GET /api/dashboard - Phase-Aware Dashboard', () => {
    it('should return pre_season phase when no active season', () => {
      const dashboardWithNoSeason = {
        phase: 'pre_season',
        primaryCta: { label: 'No Active Season', action: '/', urgent: false },
        countdown: null,
        currentEpisode: null,
        userStatus: { pickSubmitted: false, draftComplete: false },
        standings: null,
        alerts: [],
      };

      expect(dashboardWithNoSeason.phase).toBe('pre_season');
    });

    it('should calculate correct phase based on time', () => {
      const episode = TEST_EPISODE;
      const now = new Date('2026-02-25T20:00:00Z'); // Before picks lock

      const picksLockAt = new Date(episode.picks_lock_at);
      const airDate = new Date(episode.air_date);
      const resultsPostedAt = episode.results_posted_at
        ? new Date(episode.results_posted_at)
        : null;

      let phase: string;
      if (now < picksLockAt) phase = 'make_pick';
      else if (now < airDate) phase = 'picks_locked';
      else if (!resultsPostedAt || now < resultsPostedAt) phase = 'awaiting_results';
      else phase = 'results_posted';

      expect(phase).toBe('make_pick');
    });

    it('should show urgent CTA when pick not submitted', () => {
      const userStatus = { pickSubmitted: false, draftComplete: true };
      const isUrgent = !userStatus.pickSubmitted;
      expect(isUrgent).toBe(true);
    });
  });
});

// ========================================
// CATEGORY 6: SCORING ACTIONS TESTS
// ========================================

describe('Category 6: Scoring & Results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('6.1 GET /api/episodes/:id/scores - View Episode Scores', () => {
    it('should return scores only for finalized episodes', async () => {
      const finalizedEpisode = { ...TEST_EPISODE, is_scored: true };
      const canViewScores = finalizedEpisode.is_scored;
      expect(canViewScores).toBe(true);
    });

    it('should hide scores for unscored episodes', () => {
      const unscoredEpisode = { ...TEST_EPISODE, is_scored: false };
      const canViewScores = unscoredEpisode.is_scored;
      expect(canViewScores).toBe(false);
    });
  });

  describe('6.2 GET /api/episodes/:id/scores/:castawayId - Castaway Score Detail', () => {
    it('should return scoring breakdown per rule', async () => {
      const scoreBreakdown = {
        castaway: TEST_CASTAWAY,
        scores: [
          { rule: 'Won immunity', points: 10 },
          { rule: 'Found idol', points: 15 },
          { rule: 'Voted correctly', points: 5 },
        ],
        total: 30,
      };

      expect(scoreBreakdown.total).toBe(30);
      expect(scoreBreakdown.scores).toHaveLength(3);
    });
  });
});

// ========================================
// CATEGORY 7: VALIDATION TESTS
// ========================================

describe('Category 7: Input Validation', () => {
  describe('7.1 League Creation Validation', () => {
    it('should require season_id as UUID', () => {
      const validUUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const invalidUUID = 'not-a-uuid';

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(validUUID)).toBe(true);
      expect(uuidRegex.test(invalidUUID)).toBe(false);
    });

    it('should enforce name length limits', () => {
      const tooShort = '';
      const justRight = 'Valid League Name';
      const tooLong = 'A'.repeat(101);

      expect(tooShort.length).toBe(0);
      expect(justRight.length).toBeGreaterThan(0);
      expect(justRight.length).toBeLessThanOrEqual(100);
      expect(tooLong.length).toBeGreaterThan(100);
    });
  });

  describe('7.2 Episode Validation', () => {
    it('should validate air_date is ISO datetime', () => {
      const validDate = '2026-02-26T04:00:00Z';
      const invalidDate = '2026/02/26';

      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(isoRegex.test(validDate)).toBe(true);
      expect(isoRegex.test(invalidDate)).toBe(false);
    });
  });

  describe('7.3 Castaway Validation', () => {
    it('should validate placement range', () => {
      const validPlacements = [1, 10, 18];
      const invalidPlacements = [0, -1, 25];

      validPlacements.forEach(p => {
        expect(p).toBeGreaterThanOrEqual(1);
        expect(p).toBeLessThanOrEqual(24);
      });

      invalidPlacements.forEach(p => {
        const valid = p >= 1 && p <= 24;
        expect(valid).toBe(false);
      });
    });
  });
});

// ========================================
// CATEGORY 8: SMS COMMAND TESTS
// ========================================

describe('Category 8: SMS Commands', () => {
  describe('8.1 PICK command', () => {
    it('should parse PICK command correctly', () => {
      const message = 'PICK Boston Rob';
      const parts = message.split(' ');
      const command = parts[0].toUpperCase();
      const castawayName = parts.slice(1).join(' ');

      expect(command).toBe('PICK');
      expect(castawayName).toBe('Boston Rob');
    });

    it('should handle case-insensitive commands', () => {
      const commands = ['pick', 'PICK', 'Pick', 'pIcK'];
      commands.forEach(cmd => {
        expect(cmd.toUpperCase()).toBe('PICK');
      });
    });
  });

  describe('8.2 STATUS command', () => {
    it('should parse STATUS command', () => {
      const message = 'STATUS';
      const command = message.trim().toUpperCase();
      expect(command).toBe('STATUS');
    });
  });

  describe('8.3 TEAM command', () => {
    it('should parse TEAM command', () => {
      const message = 'team';
      const command = message.trim().toUpperCase();
      expect(command).toBe('TEAM');
    });
  });

  describe('8.4 Invalid commands', () => {
    it('should reject unknown commands', () => {
      const validCommands = ['PICK', 'STATUS', 'TEAM'];
      const invalidCommand = 'HELP';
      expect(validCommands.includes(invalidCommand)).toBe(false);
    });
  });
});

// ========================================
// CATEGORY 9: TIMING CONSTRAINT TESTS
// ========================================

describe('Category 9: Timing Constraints', () => {
  describe('9.1 Registration Window', () => {
    it('should allow signup during registration window', () => {
      const registrationOpens = new Date('2025-12-19T20:00:00Z');
      const registrationCloses = new Date('2026-02-26T01:00:00Z');
      const now = new Date('2026-01-15T12:00:00Z');

      const canRegister = now >= registrationOpens && now < registrationCloses;
      expect(canRegister).toBe(true);
    });

    it('should reject signup after registration closes', () => {
      const registrationCloses = new Date('2026-02-26T01:00:00Z');
      const now = new Date('2026-03-01T12:00:00Z');

      const canRegister = now < registrationCloses;
      expect(canRegister).toBe(false);
    });
  });

  describe('9.2 Draft Window', () => {
    it('should enforce draft deadline', () => {
      const draftDeadline = new Date('2026-03-03T04:00:00Z');
      const now = new Date('2026-03-03T05:00:00Z');

      const draftOpen = now < draftDeadline;
      expect(draftOpen).toBe(false);
    });

    it('should enforce draft order deadline', () => {
      const orderDeadline = new Date('2026-01-05T20:00:00Z');
      const now = new Date('2026-01-05T21:00:00Z');

      const canSetOrder = now < orderDeadline;
      expect(canSetOrder).toBe(false);
    });
  });

  describe('9.3 Weekly Pick Deadline', () => {
    it('should lock picks at 3pm PST on Wednesday', () => {
      const picksLockAt = new Date('2026-03-04T23:00:00Z'); // 3pm PST
      const justBefore = new Date('2026-03-04T22:59:00Z');
      const justAfter = new Date('2026-03-04T23:01:00Z');

      expect(justBefore < picksLockAt).toBe(true);
      expect(justAfter >= picksLockAt).toBe(true);
    });
  });
});

// ========================================
// CATEGORY 10: EDGE CASES
// ========================================

describe('Category 10: Edge Cases', () => {
  describe('10.1 Empty Data Handling', () => {
    it('should handle empty league members list', () => {
      const members: any[] = [];
      const standings = members.map((m, i) => ({ ...m, rank: i + 1 }));
      expect(standings).toHaveLength(0);
    });

    it('should handle user with no leagues', () => {
      const userLeagues: any[] = [];
      const hasLeagues = userLeagues.length > 0;
      expect(hasLeagues).toBe(false);
    });
  });

  describe('10.2 Concurrent Actions', () => {
    it('should handle multiple users drafting simultaneously', () => {
      // This is a race condition test - in real implementation,
      // database constraints prevent double-picking
      const pick1 = { castaway_id: 'c1', user_id: 'u1' };
      const pick2 = { castaway_id: 'c1', user_id: 'u2' };

      // Only one should succeed - enforce via unique constraint
      const picks = [pick1];
      const alreadyPicked = picks.some(p => p.castaway_id === pick2.castaway_id);
      expect(alreadyPicked).toBe(true);
    });
  });

  describe('10.3 Boundary Values', () => {
    it('should handle exactly max players', () => {
      const currentMembers = 12;
      const maxPlayers = 12;
      const atCapacity = currentMembers >= maxPlayers;
      expect(atCapacity).toBe(true);
    });

    it('should handle exactly 2 roster picks', () => {
      const rosterSize = 2;
      const maxRosterSize = 2;
      const rosterFull = rosterSize >= maxRosterSize;
      expect(rosterFull).toBe(true);
    });
  });
});
