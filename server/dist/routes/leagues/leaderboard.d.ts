/**
 * Global Leaderboard Route
 *
 * Cross-league leaderboard with weighted average scoring
 * Uses steeper confidence penalty for small sample sizes:
 * - 1 league: 33% weight on raw score, 67% regression to mean
 * - 2 leagues: 55% weight
 * - 3 leagues: 70% weight
 * - 4+ leagues: asymptotically approaches 100%
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=leaderboard.d.ts.map