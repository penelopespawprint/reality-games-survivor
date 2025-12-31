import rateLimit from 'express-rate-limit';
const createLimiter = (windowMs, max, message) => rateLimit({ windowMs, max, message: { error: message }, standardHeaders: true, legacyHeaders: false });
export const generalLimiter = createLimiter(60_000, 100, 'Too many requests, please try again later');
export const authLimiter = createLimiter(15 * 60_000, 10, 'Too many authentication attempts, please try again later');
export const phoneLimiter = createLimiter(60 * 60_000, 5, 'Too many verification attempts, please try again in an hour');
export const joinLimiter = createLimiter(15 * 60_000, 10, 'Too many join attempts, please try again later');
export const checkoutLimiter = createLimiter(60 * 60_000, 10, 'Too many payment attempts, please try again later');
//# sourceMappingURL=rateLimit.js.map