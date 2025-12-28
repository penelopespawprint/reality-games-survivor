/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at startup.
 * Fails fast if critical vars are missing in production.
 */

interface EnvConfig {
  required: string[];
  optional: string[];
}

const envConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
    'JWT_SECRET',
  ],
  optional: [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'SIMPLETEXTING_API_KEY',
    'CLIENT_URL',
    'CLIENT_ORIGIN',
    'CORS_ORIGIN',
    'PORT',
  ],
};

// Stripe is required in production
const productionRequired = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

export function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const key of envConfig.required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // In production, also require Stripe vars
  if (isProduction) {
    for (const key of productionRequired) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  // Check optional vars and warn if missing useful ones
  for (const key of envConfig.optional) {
    if (!process.env[key] && !productionRequired.includes(key)) {
      warnings.push(key);
    }
  }

  // Report warnings (non-fatal)
  if (warnings.length > 0 && !isProduction) {
    console.warn('⚠️  Optional environment variables not set:');
    warnings.forEach(key => console.warn(`   - ${key}`));
  }

  // Report missing required vars (fatal in production)
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));

    if (isProduction) {
      console.error('\n💥 Cannot start in production without required environment variables.');
      process.exit(1);
    } else {
      console.warn('\n⚠️  Development mode: continuing with warnings.');
    }
  } else {
    console.log('✅ All required environment variables present');
  }
}

/**
 * Get typed environment variable
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

/**
 * Get boolean environment variable
 */
export function getEnvBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get numeric environment variable
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return num;
}
