import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import server modules - built separately
import { generalLimiter } from '../server/src/config/rateLimit.js';
import authRoutes from '../server/src/routes/auth.js';
import dashboardRoutes from '../server/src/routes/dashboard.js';
import leagueRoutes from '../server/src/routes/leagues.js';
import draftRoutes from '../server/src/routes/draft.js';
import pickRoutes from '../server/src/routes/picks.js';
import scoringRoutes from '../server/src/routes/scoring.js';
import notificationRoutes from '../server/src/routes/notifications.js';
import adminRoutes from '../server/src/routes/admin.js';
import webhookRoutes from '../server/src/routes/webhooks.js';

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Raw body for Stripe webhooks
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// JSON parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting
app.use(generalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/leagues', draftRoutes);
app.use('/api/leagues', pickRoutes);
app.use('/api/episodes', scoringRoutes);
app.use('/api', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Vercel serverless handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
