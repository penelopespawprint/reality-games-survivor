import rateLimit from 'express-rate-limit';

// General API rate limit: 100 requests per minute
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for auth endpoints: 10 requests per minute
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limit for SMS verification: 3 requests per minute
export const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: { error: 'Too many SMS requests, please wait before requesting another code.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin routes: 30 requests per minute
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many admin requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook endpoints: higher limit for external services
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: { error: 'Too many webhook requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});
