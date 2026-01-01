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
import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/authenticate.js';
import dashboardRouter from './dashboard.js';
import seasonsRouter from './seasons.js';
import statsRouter from './stats.js';
const router = Router();
// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);
// Mount sub-routers
router.use('/dashboard', dashboardRouter);
router.use('/seasons', seasonsRouter);
router.use('/stats', statsRouter);
// Export for use in main router
// NOTE: The remaining routes (castaways, episodes, jobs, payments, users, leagues, email-queue, alerting)
// are still in the legacy admin.ts file. They should be extracted to their own modules in future refactoring.
export default router;
// Re-export the sub-routers for direct access if needed
export { dashboardRouter, seasonsRouter, statsRouter };
//# sourceMappingURL=index.js.map