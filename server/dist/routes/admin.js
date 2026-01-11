/**
 * Admin Routes
 *
 * Main admin router that combines modular route files.
 * Routes are organized by domain:
 * - /command-center/* - Real-time operations hub
 * - /quick-actions/* - One-click platform controls
 * - /incidents/* - Incident management
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
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';
// Import modular routers
import commandCenterRouter from './admin/command-center.js';
import quickActionsRouter from './admin/quick-actions.js';
import incidentsRouter from './admin/incidents.js';
import picksRouter from './admin/picks.js';
import draftsRouter from './admin/drafts.js';
import dashboardRouter from './admin/dashboard.js';
import seasonsRouter from './admin/seasons.js';
import castawaysRouter from './admin/castaways.js';
import episodesRouter from './admin/episodes.js';
import jobsRouter from './admin/jobs.js';
import usersRouter from './admin/users.js';
import paymentsRouter from './admin/payments.js';
import leaguesRouter from './admin/leagues.js';
import announcementsRouter from './admin/announcements.js';
import emailsRouter from './admin/emails.js';
import alertingRouter from './admin/alerting.js';
import statsRouter from './admin/stats.js';
import analyticsRouter from './admin/analytics.js';
import contentRouter from './admin/content.js';
import campaignsRouter from './admin/campaigns.js';
import socialRouter from './admin/social.js';
const router = Router();
// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);
// Mount modular routers - Command Center first for priority
router.use('/command-center', commandCenterRouter);
router.use('/quick-actions', quickActionsRouter);
router.use('/incidents', incidentsRouter);
router.use('/picks', picksRouter);
router.use('/drafts', draftsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/seasons', seasonsRouter);
router.use('/castaways', castawaysRouter);
router.use('/episodes', episodesRouter);
router.use('/jobs', jobsRouter);
router.use('/users', usersRouter);
router.use('/payments', paymentsRouter);
router.use('/leagues', leaguesRouter);
router.use('/announcements', announcementsRouter);
router.use('/stats', statsRouter); // Handles /stats/* - comprehensive analytics
router.use('/analytics', analyticsRouter); // Handles /analytics/* - 3-tab analytics
router.use('/content', contentRouter); // Handles /content/* - CMS for emails and site copy
router.use('/campaigns', campaignsRouter); // Handles /campaigns/* - Email and SMS campaigns
router.use('/social', socialRouter); // Handles /social/* - Buffer social media integration
router.use('/', emailsRouter); // Handles /email-queue/* and /failed-emails/*
router.use('/', alertingRouter); // Handles /test-alert, /alerting/*, /notification-preferences/*
export default router;
//# sourceMappingURL=admin.js.map