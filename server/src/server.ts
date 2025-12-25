import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Routes
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import leagueRoutes from './routes/leagues.js';
import draftRoutes from './routes/draft.js';
import pickRoutes from './routes/picks.js';
import waiverRoutes from './routes/waivers.js';
import scoringRoutes from './routes/scoring.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhooks.js';

// Middleware
import { generalLimiter, authLimiter, adminLimiter, webhookLimiter, smsLimiter } from './middleware/rateLimit.js';

// Jobs scheduler
import { startScheduler } from './jobs/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL || ''].filter(Boolean),
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some external resources
}));

// CORS configuration - requires explicit CORS_ORIGIN in production
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: CORS_ORIGIN not set in production!');
}
app.use(cors({
  origin: corsOrigin || (process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173'),
  credentials: true,
}));

// General rate limiting
app.use(generalLimiter);

// Raw body for Stripe webhooks
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with rate limiting
app.use('/api/me/phone', smsLimiter);  // SMS verification - very strict
app.use('/api/me/verify-phone', authLimiter);  // Auth attempts - strict
app.use('/api/me/resend-code', smsLimiter);  // SMS resend - very strict
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/leagues', draftRoutes);
app.use('/api/leagues', pickRoutes);
app.use('/api/leagues', waiverRoutes);
app.use('/api/episodes', scoringRoutes);
app.use('/api', notificationRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);  // Admin routes - moderate
app.use('/webhooks', webhookLimiter, webhookRoutes);  // Webhooks - higher limit

// Error handler - hide internal details in production
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  // Never expose internal error details to clients
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'Internal server error',
    // Only include error message in development
    ...(isProduction ? {} : { details: err.message }),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 RGFL Server running on port ${PORT}`);

  // Start the job scheduler in production
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
    startScheduler();
  }
});

export default app;
