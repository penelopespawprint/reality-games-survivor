// Email Templates Index
// Base utilities
export * from './base.js';
// Email service with all templates and send methods
export { EmailService, default as emailService } from './service.js';
// Re-export email sending utility
export { sendEmail, FROM_EMAIL, REPLY_TO } from '../config/email.js';
// Supabase Auth Templates (for copy-pasting into Supabase Dashboard)
export * from './auth/index.js';
//# sourceMappingURL=index.js.map