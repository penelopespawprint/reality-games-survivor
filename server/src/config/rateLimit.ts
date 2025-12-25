import rateLimit from 'express-rate-limit';

// General API rate limit - 100 requests per minute
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limit - stricter for login/verification
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Phone verification - very strict (prevent SMS spam)
export const phoneLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 SMS per hour
  message: { error: 'Too many verification attempts, please try again in an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// League join attempts - prevent brute-forcing passwords
export const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 join attempts per 15 minutes
  message: { error: 'Too many join attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment checkout - prevent abuse
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 checkout sessions per hour
  message: { error: 'Too many payment attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
