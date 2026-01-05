/**
 * Admin Routes Index
 *
 * Combines all admin route modules into a single router.
 * Routes are organized by domain:
 * - /dashboard/* - Dashboard, stats, activity, health
 * - /seasons/* - Season management
 * - /castaways/* - Castaway management (to be extracted)
 * - /episodes/* - Episode management (to be extracted)
 * - /jobs/* - Job management (to be extracted)
 * - /payments/* - Payment management (to be extracted)
 * - /users/* - User management (to be extracted)
 * - /leagues/* - League overview (to be extracted)
 * - /email-queue/* - Email queue management (to be extracted)
 * - /alerting/* - Alert configuration (to be extracted)
 */
import dashboardRouter from './dashboard.js';
import seasonsRouter from './seasons.js';
import statsRouter from './stats.js';
import nonprofitRouter from './nonprofit.js';
declare const router: import("express-serve-static-core").Router;
export default router;
export { dashboardRouter, seasonsRouter, statsRouter, nonprofitRouter };
//# sourceMappingURL=index.d.ts.map