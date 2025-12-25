import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Supabase (required)
  SUPABASE_URL: z.string().url().min(1, 'SUPABASE_URL is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // CORS (required in production)
  CORS_ORIGIN: z.string().optional(),

  // Stripe (optional, payments disabled if not set)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Twilio (optional, SMS disabled if not set)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Resend (optional, email disabled if not set)
  RESEND_API_KEY: z.string().optional(),

  // Scheduler
  ENABLE_SCHEDULER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables and return parsed values
 * Throws an error if required variables are missing
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    console.error('\n❌ Invalid environment variables:\n' + errors + '\n');
    throw new Error('Environment validation failed');
  }

  // Production-specific checks
  if (result.data.NODE_ENV === 'production') {
    if (!result.data.CORS_ORIGIN) {
      console.warn('⚠️  WARNING: CORS_ORIGIN not set in production');
    }
    if (!result.data.STRIPE_SECRET_KEY) {
      console.warn('⚠️  WARNING: Stripe not configured, payments disabled');
    }
    if (!result.data.TWILIO_ACCOUNT_SID) {
      console.warn('⚠️  WARNING: Twilio not configured, SMS disabled');
    }
    if (!result.data.RESEND_API_KEY) {
      console.warn('⚠️  WARNING: Resend not configured, email disabled');
    }
  }

  return result.data;
}

// Validate on import
export const env = validateEnv();
