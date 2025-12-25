import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generalLimiter } from './config/rateLimit.js';

// Routes
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import leagueRoutes from './routes/leagues.js';
import draftRoutes from './routes/draft.js';
import pickRoutes from './routes/picks.js';
import scoringRoutes from './routes/scoring.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhooks.js';

// Jobs scheduler
import { startScheduler } from './jobs/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API (frontend handles its own)
  crossOriginEmbedderPolicy: false, // Allow embedding for development
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Raw body for Stripe webhooks
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes with size limit to prevent DoS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Apply general rate limit to all API routes
app.use('/api', generalLimiter);

// Health check with dependency verification
app.get('/health', async (req, res) => {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

  // Check database connectivity
  try {
    const { supabaseAdmin } = await import('./config/supabase.js');
    const { error } = await supabaseAdmin.from('seasons').select('id').limit(1);
    if (error) throw error;
    checks.database = { status: 'ok' };
  } catch (err) {
    checks.database = { status: 'error', message: 'Database connection failed' };
    overallStatus = 'error';
  }

  // Check Stripe configuration
  try {
    const { stripe } = await import('./config/stripe.js');
    checks.stripe = stripe ? { status: 'ok' } : { status: 'error', message: 'Stripe not configured' };
  } catch (err) {
    checks.stripe = { status: 'error', message: 'Stripe configuration error' };
    overallStatus = overallStatus === 'error' ? 'error' : 'degraded';
  }

  // Check environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    checks.environment = { status: 'error', message: `Missing: ${missingVars.join(', ')}` };
    overallStatus = 'error';
  } else {
    checks.environment = { status: 'ok' };
  }

  const statusCode = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  });
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/leagues', draftRoutes);
app.use('/api/leagues', pickRoutes);
app.use('/api/episodes', scoringRoutes);
app.use('/api', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/webhooks', webhookRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 RGFL Server running on port ${PORT}`);

  // Start the job scheduler in production
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
    startScheduler();
  }
});

export default app;
