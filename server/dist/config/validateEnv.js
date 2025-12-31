export function validateEnvironment() {
    const errors = [];
    const warnings = [];
    // Required for all environments
    const required = {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    for (const [key, value] of Object.entries(required)) {
        if (!value) {
            errors.push(`Missing required env var: ${key}`);
        }
    }
    // Required for production
    if (process.env.NODE_ENV === 'production') {
        const prodRequired = {
            RESEND_API_KEY: process.env.RESEND_API_KEY,
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
            ADMIN_EMAIL: process.env.ADMIN_EMAIL,
        };
        for (const [key, value] of Object.entries(prodRequired)) {
            if (!value) {
                errors.push(`Missing production env var: ${key}`);
            }
        }
    }
    // Optional but recommended
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        warnings.push('Twilio not configured - SMS features disabled');
    }
    if (!process.env.ADMIN_PHONE) {
        warnings.push('ADMIN_PHONE not set - SMS alerts disabled');
    }
    // Validate format
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
        errors.push('SUPABASE_URL must start with https://');
    }
    if (process.env.ADMIN_EMAIL && !process.env.ADMIN_EMAIL.includes('@')) {
        errors.push('ADMIN_EMAIL must be valid email address');
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
export function printValidationReport(result) {
    console.log('\n=== Environment Validation ===');
    if (result.errors.length > 0) {
        console.error('\n❌ Errors:');
        result.errors.forEach(err => console.error(`  - ${err}`));
    }
    if (result.warnings.length > 0) {
        console.warn('\n⚠️  Warnings:');
        result.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }
    if (result.valid && result.warnings.length === 0) {
        console.log('✅ All environment variables validated');
    }
    console.log('==============================\n');
}
//# sourceMappingURL=validateEnv.js.map