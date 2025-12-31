/**
 * Admin Routes
 *
 * Main admin router that combines modular route files.
 * Routes are organized by domain:
 * - /dashboard/* - Dashboard, stats, activity, health
 * - /seasons/* - Season management
 * - /castaways/* - Castaway management
 * - /episodes/* - Episode management
 * - /jobs/* - Job management
 * - /payments/* - Payment management
 * - /users/* - User management
 * - /leagues/* - League overview
 * - /announcements/* - Announcement management
 * - /email-queue/* & /failed-emails/* - Email management
 * - /alerting/* & /test-alert - Alert configuration
 * - /notification-preferences/* - Notification stats
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=admin.d.ts.map