# Forgot Password Guide

## How It Works (Without Email Configured)

### For Users:

1. **Go to login page** → Click "Forgot password?" link
2. **Enter email address** → Click "Send reset link"
3. **Get confirmation message** → "Password reset link sent!"
4. **Wait for admin to send link** → You'll provide it manually

### For You (Admin):

1. **User requests password reset**
2. **Check your server console/logs** for output like:
   ```
   Password reset link for sarah@example.com: https://rgfl-survivor.onrender.com/reset-password/a1b2c3d4e5f6...
   ```
3. **Copy the entire URL**
4. **Send to user** via:
   - Text message
   - Slack/Discord DM
   - Email manually
   - Phone call and read it to them
5. **User clicks link** → Sets new password → Done!

## Where to Find Reset Links

### Local Development:
```bash
npm run dev:server
```
Links appear in your terminal when users request resets.

### Production (Render.com):
1. Go to Render dashboard
2. Click on your service
3. Click "Logs" tab
4. Search for "Password reset link for"
5. Copy the full URL
6. Send to user

## Security Features

- ✅ **Tokens expire in 1 hour** - Old links stop working
- ✅ **One-time use** - Token deleted after successful reset
- ✅ **Secure random tokens** - 64 character hex (impossible to guess)
- ✅ **No email enumeration** - Same message whether email exists or not
- ✅ **Password requirements** - Minimum 6 characters
- ✅ **Stored securely** - bcrypt hashing for new passwords

## If Email IS Configured

Everything is automatic:
1. User requests reset
2. Email sent instantly
3. User clicks link in email
4. User resets password
5. You don't need to do anything! ✨

## Quick Email Setup (5 minutes)

If you want to automate this:

1. **Get Gmail App Password:**
   - https://myaccount.google.com/apppasswords
   - Name it "RGFL", copy the password

2. **Add to .env:**
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password-here
   EMAIL_FROM=noreply@realitygamesfantasyleague.com
   CLIENT_URL=https://rgfl-survivor.onrender.com
   ```

3. **For Render (Production):**
   - Go to Environment tab
   - Add all 6 EMAIL_* variables
   - Click Save (will redeploy)

4. **Test it:**
   ```bash
   npx tsx scripts/test-email.ts
   ```

See `EMAIL_QUICK_START.md` for detailed instructions.

## Troubleshooting

### "I can't find the reset link in logs"

**Local:**
- Make sure dev server is running: `npm run dev:server`
- Look for "Password reset link for [email]"
- It appears immediately when user submits forgot password form

**Render:**
- Go to Logs tab
- Filter by time (links appear when requested)
- Search for "Password reset link"
- May need to scroll if lots of logs

### "The link isn't working"

**Check these:**
- Link must be complete (very long URL with token)
- Token expires in 1 hour - generate a new one
- Token is one-time use - generate new one if already used
- User must go to exact URL (no typos)

### "User says they didn't get the email"

**If email is configured:**
- Check spam folder first!
- Verify EMAIL_* variables are set correctly
- Check server logs for "✅ Email sent" or errors
- Run test script: `npx tsx scripts/test-email.ts`

**If email NOT configured:**
- This is expected behavior
- You need to manually send the link from console logs

## OAuth Users

Users who signed up with Auth0 (Continue with Auth0) don't have passwords.

If they try to use forgot password:
- System prevents it (no password to reset)
- They should use "Continue with Auth0" button on login page

## Best Practices for Beta

**For small beta (< 20 users):**
- Current setup works great
- You're available to help users quickly
- More personal support experience
- No email setup required

**For larger beta (20+ users):**
- Set up email (5 minutes with Gmail)
- Automated, scales better
- Professional experience
- Less work for you

**For production launch:**
- Use professional email service (SendGrid, Mailgun)
- Better deliverability than Gmail
- Monitor bounce rates and spam reports
- Set up SPF/DKIM for your domain

## Example User Support Conversation

**User:** "I forgot my password, can you help?"

**You:** "Sure! Go to the login page and click 'Forgot password?' then enter your email and click send."

**User:** "Okay, I did that. It says the link was sent."

**You:** *[Checks Render logs, finds reset link]*

**You:** "Here's your reset link: https://rgfl-survivor.onrender.com/reset-password/a1b2c3d4... Click that and you can set a new password."

**User:** "Got it, thanks! Working now."

**Total time:** 2 minutes

## Automation Checklist

Want to automate password resets? Here's what to do:

- [ ] Choose email provider (Gmail for quick, SendGrid for production)
- [ ] Get credentials (App Password or API key)
- [ ] Add EMAIL_* variables to .env (local) and Render (production)
- [ ] Test with script: `npx tsx scripts/test-email.ts`
- [ ] Test actual forgot password flow
- [ ] Check email inbox (and spam folder)
- [ ] Verify links work and redirect correctly
- [ ] Done! No more manual links needed

## Files Reference

- `client/src/pages/ForgotPassword.tsx` - Request reset form
- `client/src/pages/ResetPassword.tsx` - Set new password form
- `server/auth.ts` - Reset token generation and validation
- `server/email.ts` - Email templates and sending
- `EMAIL_QUICK_START.md` - Fast email setup guide
- `EMAIL_SETUP.md` - Complete email documentation
