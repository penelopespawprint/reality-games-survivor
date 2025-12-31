// Base email template wrapper with Reality Games: Survivor branding
//
// DESIGN SYSTEM:
// - Logo always on cream/white background for brand consistency
// - Cream/tan palette with burgundy accents (Survivor island aesthetic)
// - Serif headings (Georgia) for premium feel
// - Clean, modern layout with generous spacing
//
// THEME SYSTEM:
// - default: Standard notifications - burgundy accents
// - tribal: Important game events (draft, picks) - deeper burgundy borders
// - immunity: Achievements, wins, positive news - gold accents
// - tribal_council: Eliminations, urgent deadlines - fire red accents
// - merge: Team changes, new acquisitions - green accents
const LOGO_URL = 'https://survivor.realitygamesfantasyleague.com/logo.png';
const BASE_URL = process.env.BASE_URL || 'https://survivor.realitygamesfantasyleague.com';
// Brand Colors
const COLORS = {
    // Backgrounds
    outerBg: '#F5F0E6', // Cream outer background
    logoBg: '#FEFDFB', // White/cream for logo area
    contentBg: '#FEFDFB', // White content area
    footerBg: '#F5F0E6', // Cream footer
    cardBg: '#F8F5EF', // Slightly darker cream for cards
    // Text
    headingText: '#5C1717', // Dark burgundy for headings
    bodyText: '#4A3728', // Warm dark brown for body
    mutedText: '#8A7654', // Muted tan for secondary text
    // Accents
    burgundy: '#A52A2A', // Primary burgundy
    darkBurgundy: '#8B2323', // Darker burgundy for emphasis
    gold: '#D4A574', // Gold accent
    darkGold: '#8B6914', // Darker gold for text
    green: '#166534', // Success green
    lightGreen: '#22C55E', // Bright green
    red: '#DC2626', // Alert/error red
    // Borders
    borderLight: '#EDE5D5', // Light tan border
    borderMedium: '#D4C4A8', // Medium tan border
};
const themes = {
    default: {
        accentColor: COLORS.burgundy,
        accentColorDark: COLORS.darkBurgundy,
        borderColor: COLORS.borderLight,
        highlightBg: '#FDF8F3',
    },
    tribal: {
        accentColor: COLORS.burgundy,
        accentColorDark: COLORS.darkBurgundy,
        borderColor: COLORS.burgundy,
        highlightBg: '#FDF5F5',
    },
    immunity: {
        accentColor: COLORS.gold,
        accentColorDark: COLORS.darkGold,
        borderColor: COLORS.gold,
        highlightBg: '#FDF9F3',
    },
    tribal_council: {
        accentColor: COLORS.red,
        accentColorDark: '#B91C1C',
        borderColor: COLORS.red,
        highlightBg: '#FEF2F2',
    },
    merge: {
        accentColor: COLORS.lightGreen,
        accentColorDark: COLORS.green,
        borderColor: COLORS.lightGreen,
        highlightBg: '#F0FDF4',
    },
};
export function emailWrapper(content, preheader, theme = 'default') {
    const config = themes[theme];
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reality Games: Survivor</title>
  ${preheader ? `<!--[if !mso]><!--><span style="display:none;font-size:1px;color:#F5F0E6;max-height:0px;overflow:hidden;mso-hide:all;">${preheader}</span><!--<![endif]-->` : ''}
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Georgia, 'Times New Roman', serif !important;}
    .button-td { padding: 14px 28px !important; }
  </style>
  <noscript>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.outerBg}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Outer wrapper table -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${COLORS.outerBg};">
    <tr>
      <td style="padding: 32px 16px;">
        <!-- Inner container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width: 600px; margin: 0 auto; background-color: ${COLORS.contentBg}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(92, 23, 23, 0.08);">
          
          <!-- Logo Header - Always cream/white background -->
          <tr>
            <td style="background-color: ${COLORS.logoBg}; padding: 32px 40px; text-align: center; border-bottom: 3px solid ${config.borderColor};">
              <img src="${LOGO_URL}" alt="Reality Games Fantasy League" width="180" height="60" style="display: block; margin: 0 auto; width: 180px; height: auto; max-height: 60px;" />
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: ${COLORS.contentBg}; padding: 40px 40px 32px 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${COLORS.footerBg}; padding: 28px 40px; border-top: 1px solid ${COLORS.borderLight};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-weight: 600; color: ${COLORS.headingText};">Reality Games Fantasy League</p>
                    <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${COLORS.mutedText};">You're receiving this because you're part of the tribe.</p>
                    <p style="margin: 0;">
                      <a href="${BASE_URL}/profile" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${config.accentColor}; text-decoration: underline;">Manage Preferences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Legal footer outside main card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width: 600px; margin: 16px auto 0 auto;">
          <tr>
            <td style="text-align: center; padding: 0 16px;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: ${COLORS.mutedText};">
                © ${new Date().getFullYear()} Reality Games Fantasy League. All rights reserved.
              </p>
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
// ============================================================================
// COMPONENT HELPERS
// ============================================================================
export function heading(text, level = 1, color = 'burgundy') {
    const colorMap = {
        burgundy: COLORS.headingText,
        gold: COLORS.darkGold,
        error: COLORS.red,
        green: COLORS.green,
    };
    const styles = {
        1: `font-size: 28px; line-height: 1.2; margin: 0 0 20px 0;`,
        2: `font-size: 22px; line-height: 1.3; margin: 24px 0 16px 0;`,
        3: `font-size: 18px; line-height: 1.4; margin: 20px 0 12px 0;`,
    };
    return `<h${level} style="font-family: Georgia, 'Times New Roman', serif; font-weight: 700; color: ${colorMap[color]}; ${styles[level]}">${text}</h${level}>`;
}
export function paragraph(text, muted = false) {
    return `<p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.65; color: ${muted ? COLORS.mutedText : COLORS.bodyText}; margin: 0 0 16px 0;">${text}</p>`;
}
export function highlight(text, color = 'burgundy') {
    const colorMap = {
        burgundy: COLORS.burgundy,
        gold: COLORS.darkGold,
        green: COLORS.green,
    };
    return `<strong style="color: ${colorMap[color]}; font-weight: 600;">${text}</strong>`;
}
export function button(text, url, variant = 'primary') {
    const colors = {
        primary: { bg: COLORS.burgundy, text: '#FFFFFF' },
        urgent: { bg: COLORS.red, text: '#FFFFFF' },
        gold: { bg: COLORS.darkGold, text: '#FFFFFF' },
        success: { bg: COLORS.green, text: '#FFFFFF' },
    };
    const { bg, text: textColor } = colors[variant];
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;" align="center">
  <tr>
    <td style="border-radius: 10px; background-color: ${bg};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="20%" strokecolor="${bg}" fillcolor="${bg}">
        <w:anchorlock/>
        <center style="color:${textColor};font-family:sans-serif;font-size:16px;font-weight:bold;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${url}" style="display: inline-block; padding: 16px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${textColor}; text-decoration: none; border-radius: 10px; background-color: ${bg};">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>
`;
}
export function card(content, variant = 'default') {
    const styles = {
        default: { bg: COLORS.cardBg, border: COLORS.borderLight, borderWidth: '1px' },
        warning: { bg: '#FEF9E7', border: '#F59E0B', borderWidth: '2px' },
        success: { bg: '#F0FDF4', border: COLORS.lightGreen, borderWidth: '2px' },
        error: { bg: '#FEF2F2', border: COLORS.red, borderWidth: '2px' },
        immunity: { bg: '#FFFBEB', border: COLORS.gold, borderWidth: '3px' },
        highlight: { bg: '#FDF8F3', border: COLORS.burgundy, borderWidth: '2px' },
    };
    const style = styles[variant];
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
  <tr>
    <td style="background-color: ${style.bg}; border: ${style.borderWidth} solid ${style.border}; border-radius: 12px; padding: 24px;">
      ${content}
    </td>
  </tr>
</table>
`;
}
export function statBox(value, label, color = 'burgundy') {
    const colorMap = {
        burgundy: COLORS.burgundy,
        gold: COLORS.darkGold,
        dark: COLORS.headingText,
        green: COLORS.green,
        red: COLORS.red,
    };
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block; margin: 8px; min-width: 130px;">
  <tr>
    <td style="background-color: ${COLORS.cardBg}; border-radius: 12px; padding: 20px 24px; text-align: center; border: 1px solid ${COLORS.borderLight};">
      <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: 700; color: ${colorMap[color]}; line-height: 1;">${value}</div>
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.mutedText}; margin-top: 8px;">${label}</div>
    </td>
  </tr>
</table>
`;
}
export function statsRow(stats) {
    const boxes = stats.map(s => statBox(s.value, s.label, s.color || 'burgundy')).join('');
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
  <tr>
    <td style="text-align: center;">
      ${boxes}
    </td>
  </tr>
</table>
`;
}
export function featureItem(emoji, title, description) {
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
  <tr>
    <td style="width: 48px; vertical-align: top; padding-right: 16px;">
      <div style="width: 40px; height: 40px; background-color: ${COLORS.cardBg}; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">${emoji}</div>
    </td>
    <td style="vertical-align: top;">
      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${COLORS.headingText}; margin: 0 0 4px 0;">${title}</p>
      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${COLORS.mutedText}; margin: 0; line-height: 1.5;">${description}</p>
    </td>
  </tr>
</table>
`;
}
export function listItem(text, icon = '•') {
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 8px 0;">
  <tr>
    <td style="width: 24px; vertical-align: top; font-size: 16px; color: ${COLORS.burgundy}; font-weight: bold;">${icon}</td>
    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: ${COLORS.bodyText}; line-height: 1.5;">${text}</td>
  </tr>
</table>
`;
}
export function divider() {
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 28px 0;">
  <tr>
    <td style="height: 1px; background: linear-gradient(90deg, transparent, ${COLORS.borderMedium}, transparent);"></td>
  </tr>
</table>
`;
}
export function spacer(height = 24) {
    return `<div style="height: ${height}px; line-height: ${height}px; font-size: 1px;">&nbsp;</div>`;
}
export function centeredText(content) {
    return `<div style="text-align: center;">${content}</div>`;
}
export function badge(text, color = 'burgundy') {
    const colorMap = {
        burgundy: { bg: '#FDF5F5', text: COLORS.burgundy },
        gold: { bg: '#FFFBEB', text: COLORS.darkGold },
        green: { bg: '#F0FDF4', text: COLORS.green },
        red: { bg: '#FEF2F2', text: COLORS.red },
    };
    const style = colorMap[color];
    return `<span style="display: inline-block; padding: 4px 12px; background-color: ${style.bg}; color: ${style.text}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">${text}</span>`;
}
// ============================================================================
// DATE FORMATTING
// ============================================================================
export function formatDate(date, options) {
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
// Export constants
export { LOGO_URL, BASE_URL, COLORS };
//# sourceMappingURL=base.js.map