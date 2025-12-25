// Base email template wrapper with RGFL Survivor branding
//
// THEME SYSTEM:
// - default: Cream background (#F5F0E6), burgundy accents - standard notifications
// - tribal: Burgundy background (#A52A2A), cream text - important game events (draft, picks)
// - immunity: Gold border (#D4A574), cream background - achievements, wins, positive news
// - tribal_council: Dark burgundy/fire theme - eliminations, urgent deadlines
// - merge: Green accents - team changes, new acquisitions

const LOGO_URL = 'https://survivor.realitygamesfantasyleague.com/logo.png';
const BASE_URL = process.env.BASE_URL || 'https://survivor.realitygamesfantasyleague.com';

export type EmailTheme = 'default' | 'tribal' | 'immunity' | 'tribal_council' | 'merge';

interface ThemeColors {
  headerBg: string;
  headerText: string;
  contentBg: string;
  contentText: string;
  accentColor: string;
  borderColor: string;
}

const themes: Record<EmailTheme, ThemeColors> = {
  default: {
    headerBg: '#F5F0E6',
    headerText: '#A52A2A',
    contentBg: '#FEFDFB',
    contentText: '#5C1717',
    accentColor: '#A52A2A',
    borderColor: '#EDE5D5',
  },
  tribal: {
    headerBg: '#F5F0E6',
    headerText: '#A52A2A',
    contentBg: '#FEFDFB',
    contentText: '#5C1717',
    accentColor: '#A52A2A',
    borderColor: '#A52A2A',
  },
  immunity: {
    headerBg: '#F5F0E6',
    headerText: '#8B6914',
    contentBg: '#FEFDFB',
    contentText: '#5C1717',
    accentColor: '#8B6914',
    borderColor: '#D4A574',
  },
  tribal_council: {
    headerBg: '#F5F0E6',
    headerText: '#8B2323',
    contentBg: '#FEFDFB',
    contentText: '#5C1717',
    accentColor: '#DC2626',
    borderColor: '#DC2626',
  },
  merge: {
    headerBg: '#F5F0E6',
    headerText: '#166534',
    contentBg: '#FEFDFB',
    contentText: '#5C1717',
    accentColor: '#22C55E',
    borderColor: '#22C55E',
  },
};

export function emailWrapper(content: string, preheader?: string, theme: EmailTheme = 'default'): string {
  const colors = themes[theme];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RGFL Survivor Fantasy</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#fff;max-height:0px;overflow:hidden;">${preheader}</span>` : ''}
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F5F0E6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F5F0E6;">
    <tr>
      <td style="padding: 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: ${colors.contentBg}; border-radius: 12px; overflow: hidden; border: 2px solid ${colors.borderColor};">
          <!-- Header with logo on cream/tan -->
          <tr>
            <td style="background-color: ${colors.headerBg}; padding: 32px; text-align: center; border-bottom: 2px solid ${colors.borderColor};">
              <img src="${LOGO_URL}" alt="Reality Games Fantasy League" height="60" style="height: 60px; width: auto;" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px; color: ${colors.contentText}; background-color: ${colors.contentBg};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F0E6; padding: 24px; text-align: center; color: #8A7654; font-size: 12px; border-top: 1px solid ${colors.borderColor};">
              <p style="margin: 0 0 8px 0; font-weight: 500;">Reality Games Fantasy League | Survivor</p>
              <p style="margin: 0 0 8px 0;">You're receiving this because you're part of the tribe.</p>
              <p style="margin: 0;"><a href="${BASE_URL}/profile/notifications" style="color: ${colors.accentColor}; text-decoration: underline;">Manage notification preferences</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function button(text: string, url: string, variant: 'primary' | 'urgent' | 'gold' | 'success' = 'primary'): string {
  const colors = {
    primary: '#A52A2A',
    urgent: '#DC2626',
    gold: '#8B6914',
    success: '#166534',
  };

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px auto;">
  <tr>
    <td style="background-color: ${colors[variant]}; border-radius: 8px;">
      <a href="${url}" style="display: inline-block; padding: 14px 28px; color: #FEFDFB; text-decoration: none; font-weight: 600; font-size: 16px;">${text}</a>
    </td>
  </tr>
</table>
`;
}

export function statBox(value: string | number, label: string, color: 'burgundy' | 'gold' | 'dark' | 'green' = 'burgundy'): string {
  const colorMap = {
    burgundy: '#A52A2A',
    gold: '#8B6914',
    dark: '#5C1717',
    green: '#166534',
  };

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: #F5F0E6; border-radius: 12px; display: inline-block; min-width: 120px; text-align: center; margin: 8px;">
  <tr>
    <td style="padding: 20px;">
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${colorMap[color]};">${value}</div>
      <div style="color: #8A7654; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">${label}</div>
    </td>
  </tr>
</table>
`;
}

export function card(content: string, variant: 'default' | 'warning' | 'success' | 'error' | 'immunity' = 'default'): string {
  const styles = {
    default: 'background-color: #F5F0E6; border: 1px solid #EDE5D5;',
    warning: 'background-color: #FEF3C7; border: 2px solid #F59E0B;',
    success: 'background-color: #DCFCE7; border: 2px solid #22C55E;',
    error: 'background-color: #FEE2E2; border: 2px solid #DC2626;',
    immunity: 'background-color: #F5F0E6; border: 3px solid #D4A574;',
  };

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="${styles[variant]} border-radius: 12px; margin: 20px 0;">
  <tr>
    <td style="padding: 24px;">
      ${content}
    </td>
  </tr>
</table>
`;
}

export function heading(text: string, level: 1 | 2 = 1, color: 'burgundy' | 'gold' | 'error' | 'green' = 'burgundy'): string {
  const colorMap = { burgundy: '#A52A2A', gold: '#8B6914', error: '#DC2626', green: '#166534' };
  const sizes = { 1: '28px', 2: '20px' };
  return `<h${level} style="font-family: Georgia, 'Times New Roman', serif; color: ${colorMap[color]}; margin: 0 0 16px 0; font-size: ${sizes[level]}; font-weight: 700;">${text}</h${level}>`;
}

export function paragraph(text: string): string {
  return `<p style="color: #5C1717; line-height: 1.7; margin: 0 0 16px 0;">${text}</p>`;
}

export function highlight(text: string, color: 'burgundy' | 'gold' | 'green' = 'burgundy'): string {
  const colorMap = { burgundy: '#A52A2A', gold: '#8B6914', green: '#166534' };
  return `<span style="color: ${colorMap[color]}; font-weight: 600;">${text}</span>`;
}

export function divider(): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
  <tr>
    <td style="height: 1px; background: linear-gradient(90deg, transparent, #D4C4A8, transparent);"></td>
  </tr>
</table>
`;
}

// Helper to format dates consistently
export function formatDate(date: Date, options?: { includeTime?: boolean }): string {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (options?.includeTime) {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    return `${dateStr} at ${timeStr}`;
  }

  return dateStr;
}

// Survivor catchphrases for different contexts
export const survivorPhrases = {
  // Greetings
  welcome: [
    "Come on in!",
    "Welcome to the island.",
    "The adventure begins.",
  ],
  // Encouragement
  goodLuck: [
    "Outwit. Outplay. Outlast.",
    "The tribe has spoken... in your favor!",
    "May your torch burn bright.",
    "Worth playing for? Absolutely.",
    "Dig deep!",
  ],
  // Urgency
  hurry: [
    "The clock is ticking!",
    "Time to make your move!",
    "Don't get caught without a plan.",
    "This is Survivor!",
  ],
  // Elimination/Bad news
  elimination: [
    "The tribe has spoken.",
    "Your torch has been snuffed.",
    "Time to go.",
  ],
  // Success
  victory: [
    "Immunity!",
    "You've earned your place.",
    "Safe tonight.",
    "Individual immunity is yours!",
  ],
  // Draft/Picks
  strategy: [
    "Trust your gut.",
    "Make your move.",
    "Play the game.",
    "This is your moment.",
  ],
  // Closings
  signOff: [
    "See you at Tribal.",
    "The game is afoot.",
    "Stay sharp out there.",
    "39 days, 18 people, 1 Survivor.",
  ],
};

// Helper to get random phrase from category
export function getPhrase(category: keyof typeof survivorPhrases): string {
  const phrases = survivorPhrases[category];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// Export common constants
export { LOGO_URL, BASE_URL };
