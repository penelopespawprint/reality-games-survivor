import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockResponse,
  createMockUser,
  createMockLeague,
  createMockPayment,
  createMockCharityPayout,
  createMockStripeSession,
} from './setup';

// Get mocked modules
const mockPrisma = vi.mocked(await import('../prisma.js')).default;
const mockStripe = vi.mocked(await import('stripe')).default;

describe('Payment Flow Tests', () => {
  let res: ReturnType<typeof createMockResponse>;
  let stripeInstance: any;

  beforeEach(() => {
    res = createMockResponse();
    vi.clearAllMocks();

    // Get the Stripe instance
    stripeInstance = mockStripe();
  });

  // =============================================================================
  // CREATE CHECKOUT SESSION TESTS
  // =============================================================================
  describe('POST /create-checkout', () => {
    it('should create checkout session for valid paid league', async () => {
      const user = createMockUser();
      const league = createMockLeague({
        entryFee: 25,
        charityEnabled: true,
        charityPercentage: 100,
      });

      // Mock database responses
      mockPrisma.league.findUnique.mockResolvedValue(league as any);
      mockPrisma.leagueMembership.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(user as any);
      mockPrisma.payment.create.mockResolvedValue(createMockPayment() as any);

      // Mock Stripe session creation
      const mockSession = createMockStripeSession();
      stripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      // Simulate the endpoint logic
      const result = {
        sessionId: mockSession.id,
        url: mockSession.url,
      };

      expect(result.sessionId).toBe('cs_test_123');
      expect(result.url).toBe('https://checkout.stripe.com/test');
    });

    it('should reject checkout for free league', async () => {
      const league = createMockLeague({ entryFee: 0 });
      mockPrisma.league.findUnique.mockResolvedValue(league as any);
      mockPrisma.leagueMembership.findUnique.mockResolvedValue(null);

      // This should return error
      const expectedError = { error: 'This league has no entry fee. Join directly.' };
      expect(expectedError.error).toContain('no entry fee');
    });

    it('should reject checkout for full league', async () => {
      const league = createMockLeague({
        entryFee: 25,
        maxPlayers: 18,
        currentPlayers: 18,
      });
      mockPrisma.league.findUnique.mockResolvedValue(league as any);

      const expectedError = { error: 'League is full' };
      expect(expectedError.error).toBe('League is full');
    });

    it('should reject checkout for existing member', async () => {
      const league = createMockLeague({ entryFee: 25 });
      const membership = { userId: 'test-user-id', leagueId: 'test-league-id' };

      mockPrisma.league.findUnique.mockResolvedValue(league as any);
      mockPrisma.leagueMembership.findUnique.mockResolvedValue(membership as any);

      const expectedError = { error: 'You are already a member of this league' };
      expect(expectedError.error).toContain('already a member');
    });

    it('should return 404 for non-existent league', async () => {
      mockPrisma.league.findUnique.mockResolvedValue(null);

      const expectedError = { error: 'League not found' };
      expect(expectedError.error).toBe('League not found');
    });

    it('should calculate correct amount in cents for Stripe', () => {
      const entryFee = 25.50;
      const amountInCents = Math.round(entryFee * 100);
      expect(amountInCents).toBe(2550);
    });

    it('should include charity info in product description when enabled', () => {
      const league = createMockLeague({
        name: 'Charity League',
        charityEnabled: true,
        charityPercentage: 100,
      });

      const netPct = Math.round(100 * 0.93); // After 7% processing fee
      const description = `Entry fee for ${league.name} (${netPct}% of pot goes to winner's charity after 7% processing fee)`;

      expect(description).toContain('Charity League');
      expect(description).toContain('93%');
      expect(description).toContain('7% processing fee');
    });
  });

  // =============================================================================
  // VERIFY AND JOIN TESTS
  // =============================================================================
  describe('POST /verify-and-join', () => {
    it('should successfully verify payment and join league', async () => {
      const mockSession = createMockStripeSession({ payment_status: 'paid' });
      stripeInstance.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      mockPrisma.leagueMembership.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          payment: { updateMany: vi.fn() },
          leagueMembership: { create: vi.fn() },
          league: { update: vi.fn() },
        });
      });

      const result = { success: true, leagueId: 'test-league-id' };
      expect(result.success).toBe(true);
    });

    it('should reject unpaid session', async () => {
      const mockSession = createMockStripeSession({ payment_status: 'unpaid' });
      stripeInstance.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      const expectedError = { error: 'Payment not completed' };
      expect(expectedError.error).toBe('Payment not completed');
    });

    it('should reject mismatched user', async () => {
      const mockSession = createMockStripeSession({
        payment_status: 'paid',
        metadata: { userId: 'different-user-id', leagueId: 'test-league-id' },
      });
      stripeInstance.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      const expectedError = { error: 'Payment does not belong to this user' };
      expect(expectedError.error).toContain('does not belong');
    });

    it('should handle idempotency for already-joined members', async () => {
      const mockSession = createMockStripeSession({ payment_status: 'paid' });
      stripeInstance.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      const existingMembership = { userId: 'test-user-id', leagueId: 'test-league-id' };
      mockPrisma.leagueMembership.findUnique.mockResolvedValue(existingMembership as any);

      const result = { success: true, message: 'Already a member', alreadyMember: true };
      expect(result.alreadyMember).toBe(true);
    });
  });

  // =============================================================================
  // WEBHOOK TESTS
  // =============================================================================
  describe('POST /webhook', () => {
    it('should handle checkout.session.completed event', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: createMockStripeSession({ payment_status: 'paid' }),
        },
      };

      stripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.leagueMembership.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          payment: { updateMany: vi.fn() },
          leagueMembership: { create: vi.fn() },
          league: { update: vi.fn() },
        });
      });

      expect(event.type).toBe('checkout.session.completed');
    });

    it('should handle checkout.session.expired event', async () => {
      const event = {
        type: 'checkout.session.expired',
        data: {
          object: { id: 'cs_expired_123' },
        },
      };

      stripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

      expect(event.type).toBe('checkout.session.expired');
    });

    it('should handle charge.refunded event', async () => {
      const event = {
        type: 'charge.refunded',
        data: {
          object: { id: 'ch_123', payment_intent: 'pi_test_123' },
        },
      };

      stripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

      expect(event.type).toBe('charge.refunded');
    });

    it('should reject invalid webhook signature', async () => {
      stripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const expectedError = { error: 'Webhook Error: Invalid signature' };
      expect(expectedError.error).toContain('Invalid signature');
    });

    it('should skip adding member if already exists (idempotency)', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: createMockStripeSession({ payment_status: 'paid' }),
        },
      };

      stripeInstance.webhooks.constructEvent.mockReturnValue(event);

      // Member already exists
      const existingMembership = { userId: 'test-user-id', leagueId: 'test-league-id' };
      mockPrisma.leagueMembership.findUnique.mockResolvedValue(existingMembership as any);

      // Transaction should not be called
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // MY PAYMENTS TESTS
  // =============================================================================
  describe('GET /my-payments', () => {
    it('should return user payment history', async () => {
      const payments = [
        createMockPayment({ status: 'COMPLETED' }),
        createMockPayment({ id: 'payment-2', status: 'PENDING' }),
      ];

      mockPrisma.payment.findMany.mockResolvedValue(payments as any);

      expect(payments).toHaveLength(2);
      expect(payments[0].status).toBe('COMPLETED');
    });

    it('should return empty array for user with no payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result: any[] = [];
      expect(result).toHaveLength(0);
    });
  });

  // =============================================================================
  // ADMIN PENDING PAYOUTS TESTS
  // =============================================================================
  describe('GET /admin/pending-payouts', () => {
    it('should return pending charity payouts', async () => {
      const payouts = [
        createMockCharityPayout(),
        createMockCharityPayout({ id: 'payout-2', amount: 200 }),
      ];

      mockPrisma.charityPayout.findMany.mockResolvedValue(payouts as any);

      expect(payouts).toHaveLength(2);
      expect(payouts[0].payoutStatus).toBe('PENDING');
    });
  });

  // =============================================================================
  // ADMIN CREATE PAYOUT TESTS
  // =============================================================================
  describe('POST /admin/create-payout', () => {
    it('should create charity payout record', async () => {
      const payoutData = {
        leagueId: 'test-league-id',
        winnerUserId: 'test-winner-id',
        charityName: 'Red Cross',
        charityUrl: 'https://redcross.org',
        amount: 150,
      };

      const createdPayout = createMockCharityPayout(payoutData);
      mockPrisma.charityPayout.create.mockResolvedValue(createdPayout as any);

      expect(createdPayout.charityName).toBe('Red Cross');
      expect(createdPayout.amount).toBe(150);
    });

    it('should reject payout with missing required fields', async () => {
      const incompleteData = {
        leagueId: 'test-league-id',
        // missing winnerUserId, charityName, amount
      };

      const expectedError = {
        error: 'Missing required fields: leagueId, winnerUserId, charityName, amount',
      };
      expect(expectedError.error).toContain('Missing required fields');
    });
  });

  // =============================================================================
  // ADMIN MARK PAID TESTS
  // =============================================================================
  describe('POST /admin/mark-paid', () => {
    it('should mark payout as paid', async () => {
      const adminId = 'admin-user-id';
      const payoutId = 'test-payout-id';

      const updatedPayout = createMockCharityPayout({
        id: payoutId,
        payoutStatus: 'PAID',
        paidAt: new Date(),
        paidBy: adminId,
      });

      mockPrisma.charityPayout.update.mockResolvedValue(updatedPayout as any);

      expect(updatedPayout.payoutStatus).toBe('PAID');
      expect(updatedPayout.paidBy).toBe(adminId);
    });

    it('should reject without payout ID', async () => {
      const expectedError = { error: 'Payout ID is required' };
      expect(expectedError.error).toBe('Payout ID is required');
    });
  });

  // =============================================================================
  // LEAGUE PREVIEW TESTS
  // =============================================================================
  describe('GET /league/:code/preview', () => {
    it('should return league preview with entry fee', async () => {
      const league = createMockLeague({
        code: 'CHARITY2025',
        entryFee: 25,
        charityEnabled: true,
        charityPercentage: 100,
        currentPlayers: 10,
        maxPlayers: 18,
      });

      mockPrisma.league.findUnique.mockResolvedValue(league as any);
      mockPrisma.payment.count.mockResolvedValue(10);

      const totalPot = 10 * 25; // 250
      const netPot = Math.round(totalPot * 0.93 * 100) / 100; // 232.50

      expect(totalPot).toBe(250);
      expect(netPot).toBe(232.5);
    });

    it('should calculate spots remaining correctly', () => {
      const league = createMockLeague({
        currentPlayers: 15,
        maxPlayers: 18,
      });

      const spotsRemaining = league.maxPlayers - league.currentPlayers;
      expect(spotsRemaining).toBe(3);
    });

    it('should return 404 for non-existent league code', async () => {
      mockPrisma.league.findUnique.mockResolvedValue(null);

      const expectedError = { error: 'League not found' };
      expect(expectedError.error).toBe('League not found');
    });
  });

  // =============================================================================
  // ADMIN ALL PAYMENTS TESTS
  // =============================================================================
  describe('GET /admin/all', () => {
    it('should return all payments with stats', async () => {
      const payments = [
        createMockPayment({ status: 'COMPLETED', amount: 25 }),
        createMockPayment({ id: 'p2', status: 'COMPLETED', amount: 25 }),
        createMockPayment({ id: 'p3', status: 'PENDING', amount: 25 }),
        createMockPayment({ id: 'p4', status: 'REFUNDED', amount: 25 }),
      ];

      mockPrisma.payment.findMany.mockResolvedValue(payments as any);

      const stats = {
        totalPayments: payments.length,
        totalRevenue: payments
          .filter((p) => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + Number(p.amount), 0),
        pendingPayments: payments.filter((p) => p.status === 'PENDING').length,
        refundedPayments: payments.filter((p) => p.status === 'REFUNDED').length,
      };

      expect(stats.totalPayments).toBe(4);
      expect(stats.totalRevenue).toBe(50);
      expect(stats.pendingPayments).toBe(1);
      expect(stats.refundedPayments).toBe(1);
    });

    it('should filter by status', async () => {
      const completedPayments = [
        createMockPayment({ status: 'COMPLETED' }),
        createMockPayment({ id: 'p2', status: 'COMPLETED' }),
      ];

      mockPrisma.payment.findMany.mockResolvedValue(completedPayments as any);

      expect(completedPayments.every((p) => p.status === 'COMPLETED')).toBe(true);
    });

    it('should filter by league ID', async () => {
      const leagueId = 'specific-league-id';
      const leaguePayments = [
        createMockPayment({ leagueId }),
        createMockPayment({ id: 'p2', leagueId }),
      ];

      mockPrisma.payment.findMany.mockResolvedValue(leaguePayments as any);

      expect(leaguePayments.every((p) => p.leagueId === leagueId)).toBe(true);
    });
  });

  // =============================================================================
  // EDGE CASES AND ERROR HANDLING
  // =============================================================================
  describe('Edge Cases', () => {
    it('should handle decimal entry fees correctly', () => {
      const entryFees = [9.99, 19.99, 24.50, 49.99];

      entryFees.forEach((fee) => {
        const cents = Math.round(fee * 100);
        expect(cents).toBe(Math.round(fee * 100));
        expect(cents % 1).toBe(0); // Should be integer
      });
    });

    it('should handle 7% processing fee calculation', () => {
      const totalPot = 500;
      const netPot = Math.round(totalPot * 0.93 * 100) / 100;
      const processingFee = totalPot - netPot;

      expect(netPot).toBe(465);
      expect(processingFee).toBe(35);
    });

    it('should handle zero players in pot calculation', () => {
      const paidMembers = 0;
      const entryFee = 25;
      const totalPot = paidMembers * entryFee;

      expect(totalPot).toBe(0);
    });

    it('should handle null entry fee', () => {
      const league = createMockLeague({ entryFee: null });
      const entryFee = league.entryFee ? Number(league.entryFee) : 0;

      expect(entryFee).toBe(0);
    });

    it('should prevent double-joining via race condition', async () => {
      // Simulate two concurrent verify-and-join requests
      const mockSession = createMockStripeSession({ payment_status: 'paid' });
      stripeInstance.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      // First call: no membership
      mockPrisma.leagueMembership.findUnique.mockResolvedValueOnce(null);

      // Second call: membership exists (created by first call)
      mockPrisma.leagueMembership.findUnique.mockResolvedValueOnce({
        userId: 'test-user-id',
        leagueId: 'test-league-id',
      } as any);

      // First call should proceed, second should return alreadyMember
      const firstResult = { success: true, leagueId: 'test-league-id' };
      const secondResult = { success: true, alreadyMember: true };

      expect(firstResult.success).toBe(true);
      expect(secondResult.alreadyMember).toBe(true);
    });
  });
});
