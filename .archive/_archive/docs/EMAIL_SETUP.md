# Email Configuration Guide

## Overview

Your RGFL application is configured to send emails for:
- **Welcome emails** when new users sign up
- **Password reset emails** when users forget their password

## Current Status

✅ **Email code is integrated and ready**
- Welcome emails send automatically on signup (both regular and OAuth)
- Password reset emails send when requested
- Emails are non-blocking (won't slow down the app)
- Falls back to console logging if email not configured

## Configuration Options

### Option 1: Gmail (Recommended for Testing)

1. **Create or use an existing Gmail account**
   - Example: `rgfl.notifications@gmail.com`

2. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification" and follow the setup

3. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "RGFL Survivor App"
   - Copy the 16-character password (remove spaces)

4. **Add to your .env file:**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=rgfl.notifications@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # Your app password
EMAIL_FROM=noreply@realitygamesfantasyleague.com
CLIENT_URL=https://rgfl-survivor.onrender.com
```

### Option 2: SendGrid (Recommended for Production)

SendGrid offers 100 free emails per day, perfect for small leagues.

1. **Create free account**
   - Go to: https://signup.sendgrid.com/
   - Verify your email

2. **Create API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Give it "Full Access" or "Mail Send" permission
   - Copy the API key (you'll only see it once!)

3. **Verify sender email**
   - Go to Settings → Sender Authentication
   - Verify a single sender email address
   - Use the email you want to send from

4. **Add to your .env file:**
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey  # Literally the word "apikey"
EMAIL_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Your SendGrid API key
EMAIL_FROM=your-verified-email@example.com
CLIENT_URL=https://rgfl-survivor.onrender.com
```

### Option 3: Other SMTP Services

Any SMTP service works. Popular options:
- **Mailgun**: 1,000 free emails/month
- **Amazon SES**: Very cheap, requires AWS account
- **Outlook/Office 365**: Use your existing account
- **Custom domain email**: Check with your hosting provider

Generic configuration:
```bash
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587  # or 465 for SSL
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
CLIENT_URL=https://rgfl-survivor.onrender.com
```

## Testing Email Configuration

### Local Testing

1. **Add email variables to .env**
2. **Run the test script:**
```bash
npx tsx scripts/test-email.ts
```

3. **Expected output:**
```
🧪 Testing Email Configuration

1️⃣ Testing email transporter configuration...
✅ Email configuration is valid and ready to send

2️⃣ Sending test email...
✅ Test email sent successfully to rgfl.notifications@gmail.com
📬 Check your inbox to confirm receipt.
```

### Production Testing (Render.com)

1. **Add environment variables on Render:**
   - Go to your service dashboard
   - Click "Environment" tab
   - Add each EMAIL_* variable
   - Click "Save Changes" (will trigger redeploy)

2. **Test via actual signup:**
   - Create a test account
   - Check your email for welcome message
   - Try "Forgot Password" feature
   - Check email for reset link

3. **Monitor logs:**
   - Check Render logs for email confirmation
   - Look for "✅ Email sent to..." messages
   - Or "⚠️ Email not configured" if variables missing

## Email Templates

The app includes professional email templates with:
- RGFL branding (orange/red gradient headers)
- Responsive design
- Clear call-to-action buttons
- Important deadline information
- Security warnings for password resets

### Welcome Email Includes:
- Personalized greeting
- Checklist of next steps
- Important deadlines
- Link to dashboard
- Support contact info

### Password Reset Email Includes:
- Security-focused design
- One-click reset button
- Link that expires in 1 hour
- Warning about ignoring if not requested
- Support contact info

## Without Email Configuration

**The app works fine without email configured!**

If `EMAIL_USER` and `EMAIL_PASSWORD` are not set:
- Password reset links are logged to console
- Admins can manually share links with users
- Welcome emails are skipped (users can still sign up)
- Everything else functions normally

Example console output:
```
⚠️ Email not configured - password reset links will be logged to console only
Password reset link for user@example.com: http://localhost:5000/reset-password/abc123...
```

## Troubleshooting

### "Invalid login" or "Authentication failed"

**Gmail:**
- Make sure 2FA is enabled first
- Use App Password, not your regular password
- Remove spaces from the app password

**Other services:**
- Verify username/password are correct
- Check if you need to enable "less secure apps" or SMTP access

### Emails not arriving

1. **Check spam folder** - First place to look!
2. **Verify EMAIL_FROM is valid** - Some providers require verified sender
3. **Check service limits** - Free tiers have daily limits
4. **Review server logs** - Look for error messages
5. **Test with test script** - Run `npx tsx scripts/test-email.ts`

### "Connection timeout"

- **Check EMAIL_PORT**: Use 587 for TLS, 465 for SSL
- **Firewall issues**: Ensure your server can reach the SMTP host
- **Try different host**: Some networks block SMTP ports

### Emails look broken

- Most email clients render HTML well
- Test in Gmail, Outlook, and mobile
- Plain text fallback is always included
- Links will work even if styling breaks

## Production Deployment Checklist

Before going live:

- [ ] Choose email provider (Gmail, SendGrid, etc.)
- [ ] Create account and get credentials
- [ ] Add EMAIL_* variables to Render environment
- [ ] Run test script to verify configuration
- [ ] Send test signup to yourself
- [ ] Test password reset flow
- [ ] Check spam folder settings
- [ ] Verify all links work (CLIENT_URL is correct)
- [ ] Set up proper FROM address (not gmail.com if possible)
- [ ] Consider domain authentication (SPF/DKIM) for deliverability

## Security Best Practices

1. **Never commit email credentials to git**
   - Use .env file (already in .gitignore)
   - Use environment variables on hosting platform

2. **Use App Passwords or API Keys**
   - Don't use your main account password
   - Generate service-specific credentials

3. **Verify sender domain (production)**
   - Set up SPF/DKIM records
   - Use domain email, not Gmail for production
   - Improves deliverability and trust

4. **Monitor usage**
   - Watch for bounce rates
   - Check for spam reports
   - Stay within service limits

## Quick Start (Recommended Path)

**For immediate testing:**
1. Use Gmail with App Password (5 minutes to set up)
2. Run test script to verify
3. Test signup flow

**For production launch:**
1. Sign up for SendGrid (free tier)
2. Verify sender email
3. Add credentials to Render
4. Monitor first few signups

## Need Help?

- Check logs: `npx tsx scripts/test-email.ts`
- View email templates: `server/email.ts`
- Test manually: Create test account and try forgot password
- Still stuck? Email configuration is optional - app works without it!
