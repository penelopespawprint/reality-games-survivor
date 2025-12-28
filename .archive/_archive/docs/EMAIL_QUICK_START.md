# Email Quick Start Guide

## ⚡ 5-Minute Gmail Setup

### Step 1: Get Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
   - If you see "This setting is not available", enable 2FA first at https://myaccount.google.com/security
2. Select "Mail" → "Other (Custom name)" → Name it "RGFL"
3. Copy the 16-character password (like: `abcd efgh ijkl mnop`)

### Step 2: Add to .env

Add these lines to your `.env` file:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM=noreply@realitygamesfantasyleague.com
CLIENT_URL=https://rgfl-survivor.onrender.com
```

Replace `your-email@gmail.com` and the password with your actual values.

### Step 3: Test It

```bash
npx tsx scripts/test-email.ts
```

You should see:
```
✅ Email configuration is valid and ready to send
✅ Test email sent successfully
```

## 📧 What Gets Sent

**Welcome Email** - Sent when users sign up
- Greeting with their name
- Checklist of next steps
- Important deadlines
- Link to dashboard

**Password Reset Email** - Sent when users forget password
- Secure reset link (expires in 1 hour)
- One-click button to reset
- Security warning

## 🚀 Production Setup (Render.com)

1. Go to your Render dashboard
2. Click on your service
3. Go to "Environment" tab
4. Add these variables:
   - `EMAIL_HOST` = `smtp.gmail.com`
   - `EMAIL_PORT` = `587`
   - `EMAIL_USER` = `your-email@gmail.com`
   - `EMAIL_PASSWORD` = `your-app-password`
   - `EMAIL_FROM` = `noreply@realitygamesfantasyleague.com`
   - `CLIENT_URL` = `https://rgfl-survivor.onrender.com`
5. Click "Save Changes" (will auto-deploy)

## ✅ Verify It Works

**Test signup flow:**
1. Create a new test account at your signup page
2. Check email inbox for welcome email
3. Click "Forgot Password" on login page
4. Enter your email
5. Check inbox for password reset email

## 🔍 Check Logs

**Local:**
```bash
npm run dev:server
```
Look for:
- `✅ Email transporter configured`
- `✅ Email sent to user@example.com`

**Production (Render):**
- Go to "Logs" tab in Render dashboard
- Look for same messages after user signup

## ⚠️ Not Working?

**Common issues:**

1. **"Invalid login"**
   - Make sure you enabled 2FA first
   - Use App Password, not your regular Gmail password
   - Remove spaces from the app password

2. **"Email not configured"**
   - Check all EMAIL_* variables are set
   - Restart server after adding variables
   - Verify no typos in variable names

3. **Emails not arriving**
   - Check spam folder first!
   - Verify EMAIL_FROM is a real email format
   - Try sending to a different email address

## 💡 Optional: Skip Email Setup

**Your app works fine without email!**

If you don't configure email:
- Password reset links are logged to console
- You can manually share links with users
- Welcome emails are skipped
- All other features work normally

To use without email, just don't add the EMAIL_* variables. Reset links will appear in your server console logs.

## 📖 Full Documentation

For advanced setup, other email providers, troubleshooting, and production best practices, see:
- `EMAIL_SETUP.md` - Complete guide
- `server/email.ts` - Email templates and code
- `scripts/test-email.ts` - Test script
