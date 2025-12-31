// Change Email Template for Supabase
// Copy this HTML into Supabase Dashboard > Authentication > Email Templates > Change email address
export const changeEmailTemplate = `
<div style="font-family: Georgia, Times, serif; max-width: 480px; margin: 0 auto; padding: 30px;">
  
  <h1 style="color: #5C1717; font-size: 28px; margin: 0 0 8px 0; text-align: center;">
    Reality Games
  </h1>
  <p style="color: #A52A2A; font-size: 14px; margin: 0 0 30px 0; text-align: center; letter-spacing: 2px;">
    SURVIVOR
  </p>
  
  <div style="background: #FEFDFB; border: 2px solid #EDE5D5; border-radius: 8px; padding: 30px; text-align: center;">
    <h2 style="color: #5C1717; font-size: 22px; margin: 0 0 15px 0;">
      Confirm New Email
    </h2>
    <p style="color: #4A3728; font-size: 15px; line-height: 1.5; margin: 0 0 25px 0;">
      Click below to confirm your new email address.
    </p>
    <p>
      <a href="{{ .ConfirmationURL }}" style="color: #A52A2A; font-size: 16px; font-weight: bold; text-decoration: underline;">
        Confirm Email Change
      </a>
    </p>
  </div>
  
  <p style="color: #8A7654; font-size: 12px; text-align: center; margin: 25px 0 0 0;">
    If you didn't request this, contact support@realitygamesfantasyleague.com
  </p>
  
</div>
`;
export const changeEmailSubject = 'Confirm your new email - Reality Games: Survivor';
//# sourceMappingURL=change-email.js.map