/**
 * League Routes Index
 *
 * Combines all league route modules into a single router.
 * Routes are organized by domain:
 * - Core CRUD (create, join, leave, settings) - in main file
 * - /join/checkout, /join/status - Payment handling (payments.ts)
 * - /standings, /members, /transfer - Member management (members.ts)
 * - /global-leaderboard - Cross-league rankings (leaderboard.ts)
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=index.d.ts.map