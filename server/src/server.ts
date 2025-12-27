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

// Environment validation
import { validateEnvironment, printValidationReport } from './config/validateEnv.js';

// Validate environment before starting server
const envValidation = validateEnvironment();
printValidationReport(envValidation);

if (!envValidation.valid) {
  console.error('Environment validation failed, exiting...');
  process.exit(1);
}

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

// Health check - simple is better
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
