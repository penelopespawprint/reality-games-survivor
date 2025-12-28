/**
 * Pre-deploy environment validation
 * Checks that all required environment variables are set before starting the server
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
}

const ENV_VARS: EnvVar[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
    validate: (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
  },

  // Authentication
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Secret key for JWT signing',
    validate: (v) => v.length >= 32,
  },
  {
    name: 'AUTH0_DOMAIN',
    required: true,
    description: 'Auth0 tenant domain',
    validate: (v) => v.includes('.auth0.com') || v.includes('.us.auth0.com'),
  },
  {
    name: 'AUTH0_AUDIENCE',
    required: true,
    description: 'Auth0 API audience identifier',
  },

  // Stripe (required in production)
  {
    name: 'STRIPE_SECRET_KEY',
    required: process.env.NODE_ENV === 'production',
    description: 'Stripe API secret key',
    validate: (v) => v.startsWith('sk_live_') || v.startsWith('sk_test_'),
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: process.env.NODE_ENV === 'production',
    description: 'Stripe webhook signing secret',
    validate: (v) => v.startsWith('whsec_'),
  },

  // Email (Resend)
  {
    name: 'RESEND_API_KEY',
    required: process.env.NODE_ENV === 'production',
    description: 'Resend API key for sending emails',
    validate: (v) => v.startsWith('re_'),
  },

  // SMS (Twilio)
  {
    name: 'TWILIO_ACCOUNT_SID',
    required: false,
    description: 'Twilio account SID for SMS',
    validate: (v) => v.startsWith('AC'),
  },
  {
    name: 'TWILIO_AUTH_TOKEN',
    required: false,
    description: 'Twilio auth token',
  },
  {
    name: 'TWILIO_PHONE_NUMBER',
    required: false,
    description: 'Twilio sender phone number',
    validate: (v) => v.startsWith('+'),
  },

  // CORS
  {
    name: 'CLIENT_ORIGIN',
    required: process.env.NODE_ENV === 'production',
    description: 'Allowed CORS origin(s)',
  },

  // Optional but recommended
  {
    name: 'PORT',
    required: false,
    description: 'Server port (defaults to 5050)',
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Environment mode (development/production)',
    validate: (v) => ['development', 'production', 'test'].includes(v),
  },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      if (envVar.required) {
        errors.push(`Missing required env var: ${envVar.name} - ${envVar.description}`);
      } else {
        warnings.push(`Optional env var not set: ${envVar.name} - ${envVar.description}`);
      }
      continue;
    }

    if (envVar.validate && !envVar.validate(value)) {
      errors.push(`Invalid value for ${envVar.name}: ${envVar.description}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run validation and exit if critical errors found
 * Call this at server startup
 */
export function validateOrExit(): void {
  const result = validateEnvironment();

  if (result.warnings.length > 0) {
    console.warn('Environment warnings:');
    result.warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (!result.valid) {
    console.error('Environment validation failed:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
    console.error('\nPlease set the required environment variables and restart.');
    process.exit(1);
  }
}
