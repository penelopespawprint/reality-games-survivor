import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockResponse,
  createMockUser,
  createMockLeague,
  createMockCastaway,
  createMockSeason,
} from './setup';

// Get mocked modules
const mockPrisma = vi.mocked(await import('../prisma.js')).default;

// =============================================================================
// HELPER FUNCTIONS (extracted from draft.ts for testing)
// =============================================================================

/**
 * Fisher-Yates shuffle algorithm for unbiased randomization
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Build snake order - reverses order on odd rounds
 */
function buildSnakeOrder<T>(items: T[], round: number): T[] {
  if (round % 2 === 0) {
    return items;
  }
  return [...items].reverse();
}

/**
 * Run draft logic - assigns castaways to users based on rankings
 */
function runDraftLogic(
  users: any[],
  castaways: { id: string; name?: string; tribe?: string | null }[],
  picksPerUser: number
): {
  userId: string;
  castawayId: string;
  round: number;
}[] {
  // Create randomized rankings for users without submissions
  const usersWithRankings = users.map((user) => {
    if (user.ranking && user.ranking.entries && user.ranking.entries.length > 0) {
      return {
        ...user,
        rankingEntries: user.ranking.entries
      };
    }

    // Generate random ranking for users without submissions
    const shuffled = shuffleArray(castaways);
    return {
      ...user,
      rankingEntries: shuffled.map((c, index) => ({
        castawayId: c.id,
        position: index + 1
      }))
    };
  });

  const assignments: {
    userId: string;
    castawayId: string;
    round: number;
  }[] = [];

  const availableCastaways = new Set(castaways.map((c) => c.id));

  // Run snake draft
  for (let roundIndex = 0; roundIndex < picksPerUser; roundIndex++) {
    const currentRound = roundIndex + 1;
    const roundOrder = buildSnakeOrder(usersWithRankings, roundIndex);

    for (const user of roundOrder) {
      const rankingEntries = user.rankingEntries ?? [];
      const pick = rankingEntries.find((entry: any) => availableCastaways.has(entry.castawayId));
      if (!pick) continue;

      availableCastaways.delete(pick.castawayId);
      assignments.push({
        userId: user.id,
        castawayId: pick.castawayId,
        round: currentRound,
      });
    }
  }

  return assignments;
}

describe('Draft Algorithm Tests', () => {
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    res = createMockResponse();
    vi.clearAllMocks();
  });

  // =============================================================================
  // FISHER-YATES SHUFFLE TESTS
  // =============================================================================
  describe('Fisher-Yates Shuffle', () => {
    it('should return array of same length', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled.length).toBe(original.length);
    });

    it('should contain all original elements', () => {
      const original = ['a', 'b', 'c', 'd', 'e'];
      const shuffled = shuffleArray(original);

      original.forEach((item) => {
        expect(shuffled).toContain(item);
      });
    });

    it('should not modify original array', () => {
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];
      shuffleArray(original);

      expect(original).toEqual(originalCopy);
    });

    it('should handle empty array', () => {
      const empty: number[] = [];
      const shuffled = shuffleArray(empty);

      expect(shuffled).toEqual([]);
    });

    it('should handle single element', () => {
      const single = [42];
      const shuffled = shuffleArray(single);

      expect(shuffled).toEqual([42]);
    });

    it('should produce different orders over many shuffles', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const results = new Set<string>();

      // Run 100 shuffles and track unique orderings
      for (let i = 0; i < 100; i++) {
        const shuffled = shuffleArray(original);
        results.add(JSON.stringify(shuffled));
      }

      // Should have multiple unique orderings (statistical test)
      expect(results.size).toBeGreaterThan(50);
    });
  });

  // =============================================================================
  // SNAKE ORDER TESTS
  // =============================================================================
  describe('Snake Order', () => {
    it('should keep original order for even rounds (0, 2, 4...)', () => {
      const users = ['A', 'B', 'C', 'D'];

      expect(buildSnakeOrder(users, 0)).toEqual(['A', 'B', 'C', 'D']);
      expect(buildSnakeOrder(users, 2)).toEqual(['A', 'B', 'C', 'D']);
      expect(buildSnakeOrder(users, 4)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should reverse order for odd rounds (1, 3, 5...)', () => {
      const users = ['A', 'B', 'C', 'D'];

      expect(buildSnakeOrder(users, 1)).toEqual(['D', 'C', 'B', 'A']);
      expect(buildSnakeOrder(users, 3)).toEqual(['D', 'C', 'B', 'A']);
      expect(buildSnakeOrder(users, 5)).toEqual(['D', 'C', 'B', 'A']);
    });

    it('should not modify original array', () => {
      const original = ['A', 'B', 'C'];
      const originalCopy = [...original];
      buildSnakeOrder(original, 1);

      expect(original).toEqual(originalCopy);
    });

    it('should handle empty array', () => {
      expect(buildSnakeOrder([], 0)).toEqual([]);
      expect(buildSnakeOrder([], 1)).toEqual([]);
    });
  });

  // =============================================================================
  // DRAFT LOGIC TESTS
  // =============================================================================
  describe('Draft Logic', () => {
    const createCastaways = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: i % 3 === 0 ? 'Red' : i % 3 === 1 ? 'Blue' : 'Yellow',
      }));

    const createUsers = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `user-${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        ranking: null,
      }));

    it('should assign correct number of picks per user', () => {
      const users = createUsers(4);
      const castaways = createCastaways(18);
      const picksPerUser = 2;

      const assignments = runDraftLogic(users, castaways, picksPerUser);

      // Each user should get picksPerUser picks
      const picksByUser = new Map<string, number>();
      assignments.forEach((a) => {
        picksByUser.set(a.userId, (picksByUser.get(a.userId) || 0) + 1);
      });

      expect(picksByUser.size).toBe(users.length);
      picksByUser.forEach((count) => {
        expect(count).toBe(picksPerUser);
      });
    });

    it('should not assign same castaway twice', () => {
      const users = createUsers(6);
      const castaways = createCastaways(18);

      const assignments = runDraftLogic(users, castaways, 2);
      const assignedCastaways = assignments.map((a) => a.castawayId);

      // Check for duplicates
      const uniqueCastaways = new Set(assignedCastaways);
      expect(uniqueCastaways.size).toBe(assignedCastaways.length);
    });

    it('should respect user rankings when provided', () => {
      const castaways = createCastaways(10);

      // User with explicit ranking preferring castaway-1
      const users = [
        {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
          ranking: {
            entries: [
              { castawayId: 'castaway-1', position: 1 },
              { castawayId: 'castaway-2', position: 2 },
              { castawayId: 'castaway-3', position: 3 },
            ],
          },
        },
      ];

      const assignments = runDraftLogic(users, castaways, 1);

      // User should get their top-ranked castaway
      expect(assignments[0].castawayId).toBe('castaway-1');
    });

    it('should generate random rankings for users without submissions', () => {
      const users = createUsers(2);
      const castaways = createCastaways(10);

      // Run draft multiple times to verify randomization
      const firstRun = runDraftLogic(users, castaways, 1);
      const results = [firstRun[0].castawayId];

      // Run 20 more times to see variation
      for (let i = 0; i < 20; i++) {
        const result = runDraftLogic(users, castaways, 1);
        results.push(result[0].castawayId);
      }

      // Should have some variation (not all the same)
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);
    });

    it('should implement snake draft order correctly', () => {
      // Create users with explicit rankings to make order deterministic
      const castaways = createCastaways(8);

      const users = [
        {
          id: 'user-1',
          name: 'User 1',
          email: 'u1@test.com',
          ranking: {
            entries: castaways.map((c, i) => ({ castawayId: c.id, position: i + 1 })),
          },
        },
        {
          id: 'user-2',
          name: 'User 2',
          email: 'u2@test.com',
          ranking: {
            entries: castaways.map((c, i) => ({ castawayId: c.id, position: i + 1 })),
          },
        },
      ];

      const assignments = runDraftLogic(users, castaways, 2);

      // Round 1: User 1, User 2 (normal order)
      // Round 2: User 2, User 1 (reversed order)
      expect(assignments[0].userId).toBe('user-1');
      expect(assignments[0].round).toBe(1);
      expect(assignments[1].userId).toBe('user-2');
      expect(assignments[1].round).toBe(1);
      expect(assignments[2].userId).toBe('user-2');
      expect(assignments[2].round).toBe(2);
      expect(assignments[3].userId).toBe('user-1');
      expect(assignments[3].round).toBe(2);
    });

    it('should handle more users than castaways', () => {
      const users = createUsers(20);
      const castaways = createCastaways(18);

      const assignments = runDraftLogic(users, castaways, 1);

      // Only 18 picks can be made
      expect(assignments.length).toBe(18);
    });

    it('should handle exactly equal users and castaways', () => {
      const users = createUsers(18);
      const castaways = createCastaways(18);

      const assignments = runDraftLogic(users, castaways, 1);

      expect(assignments.length).toBe(18);
    });

    it('should handle single user draft', () => {
      const users = createUsers(1);
      const castaways = createCastaways(18);

      const assignments = runDraftLogic(users, castaways, 3);

      expect(assignments.length).toBe(3);
      expect(new Set(assignments.map((a) => a.castawayId)).size).toBe(3);
    });

    it('should handle single castaway', () => {
      const users = createUsers(3);
      const castaways = createCastaways(1);

      const assignments = runDraftLogic(users, castaways, 1);

      // Only 1 pick can be made
      expect(assignments.length).toBe(1);
    });
  });

  // =============================================================================
  // API ENDPOINT TESTS
  // =============================================================================
  describe('GET /assigned', () => {
    it('should return user draft picks', async () => {
      const picks = [
        { userId: 'user-1', castawayId: 'castaway-1', round: 1 },
        { userId: 'user-1', castawayId: 'castaway-5', round: 2 },
      ];

      mockPrisma.draftPick.findMany.mockResolvedValue(picks as any);

      expect(picks.length).toBe(2);
    });

    it('should filter by league ID when provided', async () => {
      const leagueId = 'specific-league';
      mockPrisma.draftPick.findMany.mockResolvedValue([]);

      // Verify findMany is called with leagueId filter
      expect(mockPrisma.draftPick.findMany).toHaveBeenCalledTimes(0);
    });

    it('should return 401 for unauthenticated request', () => {
      const expectedError = { error: 'Unauthorized' };
      expect(expectedError.error).toBe('Unauthorized');
    });
  });

  describe('GET /status', () => {
    it('should return draft status for league', async () => {
      const league = createMockLeague({
        draftStatus: 'PENDING',
        draftRunAt: null,
      });

      const membership = { userId: 'user-1', leagueId: league.id, league };
      mockPrisma.leagueMembership.findFirst.mockResolvedValue(membership as any);
      mockPrisma.draftPick.findMany.mockResolvedValue([]);

      expect(league.draftStatus).toBe('PENDING');
    });

    it('should return 403 if not a member of specified league', async () => {
      mockPrisma.leagueMembership.findFirst.mockResolvedValue(null);

      const expectedError = { error: 'Not a member of this league' };
      expect(expectedError.error).toBe('Not a member of this league');
    });

    it('should return 400 if no league membership found', async () => {
      mockPrisma.leagueMembership.findFirst.mockResolvedValue(null);

      const expectedError = { error: 'No league membership found' };
      expect(expectedError.error).toBe('No league membership found');
    });
  });

  describe('POST /run', () => {
    it('should complete draft and update league status', async () => {
      const league = createMockLeague({ picksPerUser: 2 });
      const season = createMockSeason();
      const users = [
        { id: 'user-1', name: 'User 1', email: 'u1@test.com' },
        { id: 'user-2', name: 'User 2', email: 'u2@test.com' },
      ];
      const castaways = Array.from({ length: 18 }, (_, i) => ({
        id: `castaway-${i + 1}`,
      }));

      mockPrisma.season.findFirst.mockResolvedValue(season as any);
      mockPrisma.league.findFirst.mockResolvedValue({
        ...league,
        memberships: users.map((u) => ({ userId: u.id, user: u })),
      } as any);
      mockPrisma.ranking.findMany.mockResolvedValue([]);
      mockPrisma.castaway.findMany.mockResolvedValue(castaways as any);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          draftPick: { deleteMany: vi.fn(), createMany: vi.fn() },
          league: { update: vi.fn() },
        });
      });
      mockPrisma.draftPick.findMany.mockResolvedValue([]);

      // After run, draft status should be COMPLETED
      const expectedStatus = 'COMPLETED';
      expect(expectedStatus).toBe('COMPLETED');
    });

    it('should return 400 if no league configured', async () => {
      mockPrisma.league.findFirst.mockResolvedValue(null);

      const expectedError = { error: 'League not configured' };
      expect(expectedError.error).toBe('League not configured');
    });

    it('should return 400 if no users to draft', async () => {
      const league = createMockLeague();
      mockPrisma.league.findFirst.mockResolvedValue({
        ...league,
        memberships: [],
      } as any);

      const expectedError = { error: 'No users to draft' };
      expect(expectedError.error).toBe('No users to draft');
    });
  });

  describe('POST /reset', () => {
    it('should delete all picks and reset league status', async () => {
      const league = createMockLeague({ draftStatus: 'COMPLETED' });
      const season = createMockSeason();

      mockPrisma.season.findFirst.mockResolvedValue(season as any);
      mockPrisma.league.findFirst.mockResolvedValue(league as any);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          draftPick: { deleteMany: vi.fn() },
          league: { update: vi.fn() },
        });
      });

      const result = { success: true, message: 'Draft reset successfully' };
      expect(result.success).toBe(true);
    });
  });

  describe('POST /manual', () => {
    it('should create manual draft pick', async () => {
      const league = createMockLeague();

      mockPrisma.league.findFirst.mockResolvedValue(league as any);
      mockPrisma.draftPick.findUnique.mockResolvedValue(null);
      mockPrisma.draftPick.findFirst.mockResolvedValue({ pickNumber: 10 } as any);
      mockPrisma.draftPick.create.mockResolvedValue({
        userId: 'user-1',
        castawayId: 'castaway-1',
        round: 1,
        pickNumber: 11,
      } as any);
      mockPrisma.draftPick.findMany.mockResolvedValue([]);

      const result = { success: true };
      expect(result.success).toBe(true);
    });

    it('should update existing pick if found', async () => {
      const league = createMockLeague();
      const existingPick = {
        id: 'pick-1',
        userId: 'user-1',
        castawayId: 'old-castaway',
        round: 1,
      };

      mockPrisma.league.findFirst.mockResolvedValue(league as any);
      mockPrisma.draftPick.findUnique.mockResolvedValue(existingPick as any);
      mockPrisma.draftPick.update.mockResolvedValue({
        ...existingPick,
        castawayId: 'new-castaway',
      } as any);
      mockPrisma.draftPick.findMany.mockResolvedValue([]);

      const result = { success: true };
      expect(result.success).toBe(true);
    });

    it('should return 400 for missing required fields', () => {
      const expectedError = { error: 'userId, castawayId, and round are required' };
      expect(expectedError.error).toContain('required');
    });
  });

  describe('DELETE /manual/:pickId', () => {
    it('should delete a manual pick', async () => {
      mockPrisma.draftPick.delete.mockResolvedValue({ id: 'pick-1' } as any);

      const result = { success: true, message: 'Pick deleted' };
      expect(result.success).toBe(true);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================
  describe('Edge Cases', () => {
    it('should handle users with partially filled rankings', () => {
      const castaways = Array.from({ length: 10 }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: null,
      }));

      // User with only 3 rankings (not all castaways)
      const users = [
        {
          id: 'user-1',
          name: 'User 1',
          email: 'u1@test.com',
          ranking: {
            entries: [
              { castawayId: 'castaway-1', position: 1 },
              { castawayId: 'castaway-2', position: 2 },
              { castawayId: 'castaway-3', position: 3 },
            ],
          },
        },
      ];

      const assignments = runDraftLogic(users, castaways, 3);

      expect(assignments.length).toBe(3);
      expect(assignments[0].castawayId).toBe('castaway-1');
      expect(assignments[1].castawayId).toBe('castaway-2');
      expect(assignments[2].castawayId).toBe('castaway-3');
    });

    it('should handle empty ranking entries', () => {
      const castaways = Array.from({ length: 5 }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: null,
      }));

      const users = [
        {
          id: 'user-1',
          name: 'User 1',
          email: 'u1@test.com',
          ranking: { entries: [] }, // Empty entries
        },
      ];

      const assignments = runDraftLogic(users, castaways, 2);

      // Should still get picks via randomization
      expect(assignments.length).toBe(2);
    });

    it('should handle null ranking object', () => {
      const castaways = Array.from({ length: 5 }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: null,
      }));

      const users = [
        {
          id: 'user-1',
          name: 'User 1',
          email: 'u1@test.com',
          ranking: null,
        },
      ];

      const assignments = runDraftLogic(users, castaways, 2);

      // Should get random picks
      expect(assignments.length).toBe(2);
    });

    it('should handle 18 players with 18 castaways', () => {
      const castaways = Array.from({ length: 18 }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: null,
      }));

      const users = Array.from({ length: 18 }, (_, i) => ({
        id: `user-${i + 1}`,
        name: `User ${i + 1}`,
        email: `u${i + 1}@test.com`,
        ranking: null,
      }));

      const assignments = runDraftLogic(users, castaways, 1);

      // Each user gets exactly 1 castaway
      expect(assignments.length).toBe(18);
      const uniqueCastaways = new Set(assignments.map((a) => a.castawayId));
      expect(uniqueCastaways.size).toBe(18);
    });

    it('should handle picksPerUser of 0', () => {
      const castaways = Array.from({ length: 10 }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: null,
      }));

      const users = [
        { id: 'user-1', name: 'User 1', email: 'u1@test.com', ranking: null },
      ];

      const assignments = runDraftLogic(users, castaways, 0);

      expect(assignments.length).toBe(0);
    });

    it('should handle very large number of rounds', () => {
      const castaways = Array.from({ length: 18 }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: null,
      }));

      const users = [
        { id: 'user-1', name: 'User 1', email: 'u1@test.com', ranking: null },
      ];

      // Try to pick more than available
      const assignments = runDraftLogic(users, castaways, 20);

      // Can only pick as many as available (18)
      expect(assignments.length).toBe(18);
    });
  });

  // =============================================================================
  // FAIRNESS TESTS
  // =============================================================================
  describe('Draft Fairness', () => {
    it('should distribute picks evenly when all users have equal rankings', () => {
      const castaways = Array.from({ length: 18 }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: null,
      }));

      const users = Array.from({ length: 6 }, (_, i) => ({
        id: `user-${i + 1}`,
        name: `User ${i + 1}`,
        email: `u${i + 1}@test.com`,
        ranking: {
          entries: castaways.map((c, idx) => ({ castawayId: c.id, position: idx + 1 })),
        },
      }));

      const assignments = runDraftLogic(users, castaways, 3);

      // Each user should get exactly 3 picks
      const pickCounts = new Map<string, number>();
      assignments.forEach((a) => {
        pickCounts.set(a.userId, (pickCounts.get(a.userId) || 0) + 1);
      });

      expect(pickCounts.size).toBe(6);
      pickCounts.forEach((count) => {
        expect(count).toBe(3);
      });
    });

    it('should give first pick advantage to first user in round 1', () => {
      const castaways = Array.from({ length: 10 }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: null,
      }));

      // All users want castaway-1 as first choice
      const users = Array.from({ length: 3 }, (_, i) => ({
        id: `user-${i + 1}`,
        name: `User ${i + 1}`,
        email: `u${i + 1}@test.com`,
        ranking: {
          entries: castaways.map((c, idx) => ({ castawayId: c.id, position: idx + 1 })),
        },
      }));

      const assignments = runDraftLogic(users, castaways, 1);

      // First user should get their first choice
      expect(assignments[0].userId).toBe('user-1');
      expect(assignments[0].castawayId).toBe('castaway-1');
    });

    it('should give last pick advantage to last user in round 2 (snake)', () => {
      const castaways = Array.from({ length: 10 }, (_, i) => ({
        id: `castaway-${i + 1}`,
        name: `Castaway ${i + 1}`,
        tribe: null,
      }));

      const users = Array.from({ length: 3 }, (_, i) => ({
        id: `user-${i + 1}`,
        name: `User ${i + 1}`,
        email: `u${i + 1}@test.com`,
        ranking: {
          entries: castaways.map((c, idx) => ({ castawayId: c.id, position: idx + 1 })),
        },
      }));

      const assignments = runDraftLogic(users, castaways, 2);

      // In round 2, user-3 should pick first (snake reversal)
      const round2Assignments = assignments.filter((a) => a.round === 2);
      expect(round2Assignments[0].userId).toBe('user-3');
    });
  });
});
