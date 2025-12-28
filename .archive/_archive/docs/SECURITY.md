# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please email: security@realitygamesfantasyleague.com

**Please do not create public GitHub issues for security vulnerabilities.**

## Security Measures Implemented

### Authentication & Authorization
- JWT-based authentication with secure secret management
- Password hashing using bcrypt (10 rounds)
- Admin-only endpoints protected with `requireAdmin` middleware
- Session cookies with `httpOnly`, `secure`, and `sameSite` flags

### Rate Limiting
- Auth endpoints: 10 requests per 15 minutes per IP
- General API endpoints: 100 requests per minute per IP
- Prevents brute force attacks and API abuse

### Environment Variables
- **CRITICAL**: Never commit `.env` file to version control
- All secrets must be set via environment variables in production
- Application will exit if `JWT_SECRET` is missing in production mode

### Database Security
- Using Prisma ORM to prevent SQL injection
- Parameterized queries for all database operations
- No raw SQL queries exposed to user input

### Password Requirements
- Minimum 6 characters (consider increasing to 8+)
- Hashed with bcrypt before storage
- Current password required for password changes
- OAuth users cannot change password through standard flow

### CORS Configuration
- Configured allowed origins via `CLIENT_ORIGIN` environment variable
- Credentials enabled for cookie-based auth
- No wildcard `*` origins in production

### Setup Endpoint
- Protected by `ENABLE_SETUP_ENDPOINT` environment variable
- Should be disabled (`false`) in production
- Only enable temporarily for initial database setup

## Required Environment Variables

### Critical (Must be set in production)
```bash
DATABASE_URL=postgresql://... # Your secure database connection string
JWT_SECRET=... # Generate with: openssl rand -hex 64
NODE_ENV=production
CLIENT_ORIGIN=https://your-domain.com
```

### Recommended
```bash
ENABLE_SETUP_ENDPOINT=false
CLIENT_URL=https://your-domain.com
EMAIL_HOST=smtp.provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@domain.com
```

## Security Best Practices

### For Developers
1. **Never commit secrets** - Always use `.env` file and keep it in `.gitignore`
2. **Rotate secrets regularly** - Change JWT_SECRET periodically
3. **Keep dependencies updated** - Run `npm audit` regularly
4. **Review permissions** - Ensure users can only access their own data
5. **Validate all inputs** - Use Zod schemas for request validation

### For Deployment
1. Set all environment variables securely
2. Enable HTTPS only
3. Use secure database connections (SSL/TLS)
4. Keep `ENABLE_SETUP_ENDPOINT=false`
5. Monitor for unusual API activity
6. Regularly backup database

## Known Limitations

1. **Password strength** - Currently only requires 6 characters (recommend 8+)
2. **No 2FA** - Two-factor authentication not yet implemented
3. **No CAPTCHA** - Rate limiting only, no CAPTCHA for signup/login
4. **Session management** - No forced logout or session invalidation
5. **Email verification** - Welcome emails sent but not required for activation

## Vulnerability Disclosure Timeline

We aim to:
- Acknowledge vulnerabilities within 48 hours
- Provide a fix within 7 days for critical issues
- Provide a fix within 30 days for non-critical issues

Thank you for helping keep RGFL Survivor secure!
