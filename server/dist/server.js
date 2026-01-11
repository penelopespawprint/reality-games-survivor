// Load environment variables before anything else
import 'dotenv/config';
// IMPORTANT: Import instrument.js at the very top for Sentry auto-instrumentation
import './instrument.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generalLimiter } from './config/rateLimit.js';
import { Sentry } from './config/sentry.js';
// Routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import leagueRoutes from './routes/leagues/index.js';
import draftRoutes from './routes/draft.js';
import pickRoutes from './routes/picks.js';
import scoringRoutes from './routes/scoring.js';
import scoringRecalculateRoutes from './routes/scoring-recalculate.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhooks.js';
import resultsRoutes from './routes/results.js';
import triviaRoutes from './routes/trivia.js';
import siteCopyRoutes from './routes/site-copy.js';
import statsRoutes from './routes/stats.js';
import rankingsRoutes from './routes/rankings.js';
// Jobs scheduler
import { startScheduler } from './jobs/index.js';
// Job alerting
import { initializeAlerting } from './jobs/jobAlerting.js';
// Environment validation
import { validateEnvironment, printValidationReport } from './config/validateEnv.js';
// Error handling utilities
import { enqueueEmail } from './lib/email-queue.js';
// Validate environment before starting server
const envValidation = validateEnvironment();
printValidationReport(envValidation);
if (!envValidation.valid) {
    console.error('Environment validation failed, exiting...');
    process.exit(1);
}
const app = express();
// Sentry request handler must be the first middleware
// Note: In Sentry SDK v8+, setupExpressErrorHandler is used instead of Handlers
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
// Health check route (no rate limiting for monitoring)
app.use('/', healthRoutes);
// Debug route for testing Sentry error tracking
app.get('/debug-sentry', function mainHandler(req, res) {
    throw new Error('My first Sentry error!');
});
// API Routes
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/leagues', draftRoutes);
app.use('/api/leagues', pickRoutes);
app.use('/api/episodes', scoringRoutes);
app.use('/api/scoring', scoringRecalculateRoutes);
app.use('/api', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/trivia', triviaRoutes);
app.use('/api/site-copy', siteCopyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/webhooks', webhookRoutes);
// Sentry error handler - In Sentry SDK v8+, use setupExpressErrorHandler
if (Sentry && typeof Sentry.setupExpressErrorHandler === 'function') {
    Sentry.setupExpressErrorHandler(app);
}
// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    // Send to Sentry
    if (Sentry) {
        Sentry.captureException(err, {
            tags: {
                route: req.path,
                method: req.method,
            },
            extra: {
                body: req.body,
                query: req.query,
                params: req.params,
            },
        });
    }
    res.status(500).json({ error: 'Internal server error' });
});
// Store server instance for graceful shutdown
let server = null;
// Process error handlers - registered BEFORE starting server
/**
 * Handle unhandled promise rejections
 * These indicate bugs in async code that don't have proper error handling
 */
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);
    // Log with full context
    const errorDetails = reason instanceof Error
        ? `${reason.message}\n${reason.stack}`
        : JSON.stringify(reason, null, 2);
    console.error('Error details:', errorDetails);
    // Send to Sentry
    if (Sentry) {
        Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
            tags: {
                type: 'unhandledRejection',
            },
        });
    }
    // Alert admin via email queue
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
        enqueueEmail({
            to: adminEmail,
            subject: '[RG:S] Unhandled Rejection',
            html: `
        <h2>Unhandled Promise Rejection</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        <h3>Error Details:</h3>
        <pre>${errorDetails}</pre>
        <h3>Promise:</h3>
        <pre>${promise}</pre>
      `,
            text: `Unhandled Promise Rejection\n\nTime: ${new Date().toISOString()}\nEnvironment: ${process.env.NODE_ENV || 'development'}\n\nError:\n${errorDetails}`,
            type: 'critical'
        }).catch((err) => {
            console.error('Failed to enqueue error alert email:', err);
        });
    }
    // DO NOT exit process - let it continue handling requests
    // Production systems should stay up and continue serving traffic
});
/**
 * Handle uncaught exceptions
 * These are critical errors that require graceful shutdown
 */
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // Log error with full context
    const errorDetails = `${error.message}\n${error.stack}`;
    console.error('Initiating graceful shutdown due to uncaught exception...');
    // Send to Sentry before shutdown
    if (Sentry) {
        Sentry.captureException(error, {
            tags: {
                type: 'uncaughtException',
            },
        });
        // Flush Sentry before exiting
        Sentry.flush(2000).then(() => {
            process.exit(1);
        });
    }
    // Alert admin via email queue
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
        enqueueEmail({
            to: adminEmail,
            subject: '[RG:S] Critical Error',
            html: `
        <h2>Uncaught Exception - Server Shutdown</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        <p><strong>Status:</strong> Server is shutting down</p>
        <h3>Error Details:</h3>
        <pre>${errorDetails}</pre>
      `,
            text: `Uncaught Exception - Server Shutdown\n\nTime: ${new Date().toISOString()}\nEnvironment: ${process.env.NODE_ENV || 'development'}\n\nError:\n${errorDetails}`,
            type: 'critical'
        }).catch((err) => {
            console.error('Failed to enqueue critical error email:', err);
        });
    }
    // Gracefully shutdown
    gracefulShutdown('uncaught exception', 1);
});
/**
 * Handle SIGTERM signal (e.g., from Railway, Kubernetes, Docker)
 */
process.on('SIGTERM', () => {
    console.log('📡 SIGTERM signal received');
    gracefulShutdown('SIGTERM', 0);
});
/**
 * Handle SIGINT signal (e.g., Ctrl+C)
 */
process.on('SIGINT', () => {
    console.log('📡 SIGINT signal received');
    gracefulShutdown('SIGINT', 0);
});
/**
 * Graceful shutdown handler
 * Closes server and database connections before exiting
 */
async function gracefulShutdown(signal, exitCode) {
    console.log(`🛑 Graceful shutdown initiated (${signal})...`);
    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
        console.error('⚠️  Graceful shutdown timeout exceeded, forcing exit...');
        process.exit(1);
    }, 30000); // 30 second timeout
    try {
        // Stop accepting new requests
        if (server) {
            console.log('⏸️  Closing HTTP server...');
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        console.error('Error closing server:', err);
                        reject(err);
                    }
                    else {
                        console.log('✓ HTTP server closed');
                        resolve();
                    }
                });
            });
        }
        // Close database connections
        console.log('⏸️  Closing database connections...');
        // Supabase client doesn't have an explicit close method,
        // but we can give pending queries time to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✓ Database connections closed');
        // Clear the force exit timeout
        clearTimeout(forceExitTimeout);
        console.log('✓ Graceful shutdown complete');
        process.exit(exitCode);
    }
    catch (err) {
        console.error('Error during graceful shutdown:', err);
        clearTimeout(forceExitTimeout);
        process.exit(1);
    }
}
server = app.listen(PORT, async () => {
    console.log(`🚀 Reality Games: Survivor API running on port ${PORT}`);
    // Initialize job alerting system
    initializeAlerting({
        adminEmail: process.env.ADMIN_EMAIL,
        adminPhone: process.env.ADMIN_PHONE,
    });
    // Start the job scheduler in production
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
        await startScheduler();
    }
});
export default app;
//# sourceMappingURL=server.js.map