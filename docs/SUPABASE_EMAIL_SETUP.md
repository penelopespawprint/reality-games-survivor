# Supabase Email Template Setup

## How to Update Email Templates in Supabase

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/qxrgejdfxcvsfktgysop
   - Click on **Authentication** in the left sidebar
   - Click on **Email Templates**

2. **Update "Confirm signup" Template**
   - Click on the **"Confirm signup"** template
   - Set **Subject** to: `Confirm your email - Fantasy Survivor`
   - Copy the HTML from `docs/supabase-email-template-confirm-signup.html`
   - Paste into the **Body** field
   - Click **Save**

3. **Update "Magic Link" Template**
   - Click on the **"Magic Link"** template  
   - Set **Subject** to: `Sign in to Fantasy Survivor`
   - Copy the HTML from `docs/supabase-email-template-magic-link.html`
   - Paste into the **Body** field
   - Click **Save**

## Template Variables

The templates use these Supabase variables:
- `{{ .ConfirmationURL }}` - The confirmation/sign-in link
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - OTP token (if using OTP)

## Testing

After updating, test by:
1. Requesting a magic link signup
2. Check your email to see the new template
3. Verify the styling and links work correctly
