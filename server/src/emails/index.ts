// Email Templates Index
// Base utilities
export * from './base.js';

// Transactional emails
export * from './transactional/welcome.js';
export * from './transactional/league-created.js';
export * from './transactional/league-joined.js';
export * from './transactional/draft-pick-confirmed.js';
export * from './transactional/draft-complete.js';
export * from './transactional/pick-confirmed.js';
export * from './transactional/auto-pick-alert.js';
export * from './transactional/waiver-submitted.js';
export * from './transactional/waiver-result.js';
export * from './transactional/payment-confirmed.js';
export * from './transactional/refund-issued.js';

// Reminder emails
export * from './reminders/draft-reminder.js';
export * from './reminders/draft-final-warning.js';
export * from './reminders/pick-reminder.js';
export * from './reminders/pick-final-warning.js';
export * from './reminders/waiver-open.js';
export * from './reminders/waiver-reminder.js';

// Results emails
export * from './results/episode-results.js';
export * from './results/elimination-alert.js';

// Re-export email sending utility
export { sendEmail, FROM_EMAIL, REPLY_TO } from '../config/email.js';
