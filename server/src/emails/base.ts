// Base email template wrapper with RGFL branding
export function emailWrapper(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RGFL Survivor Fantasy</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#fff;max-height:0px;overflow:hidden;">${preheader}</span>` : ''}
  <style>
    body { margin: 0; padding: 0; background-color: #4a1d3c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #5e2848; }
    .header { background: linear-gradient(135deg, #4a1d3c 0%, #6b2c52 100%); padding: 32px; text-align: center; }
    .logo { color: #d4a656; font-size: 28px; font-weight: bold; letter-spacing: 2px; }
    .content { padding: 32px; color: #ffffff; }
    .btn { display: inline-block; background-color: #d4a656; color: #4a1d3c !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0; }
    .btn:hover { background-color: #e5b866; }
    .footer { background-color: #3d1530; padding: 24px; text-align: center; color: #b8a; font-size: 12px; }
    h1, h2 { color: #d4a656; margin: 0 0 16px 0; }
    p { color: #e8d0df; line-height: 1.6; margin: 0 0 16px 0; }
    .stat { background-color: #4a1d3c; border-radius: 8px; padding: 16px; margin: 8px 0; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #d4a656; }
    .stat-label { color: #b8a; font-size: 12px; text-transform: uppercase; }
    .card { background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 16px 0; }
    .highlight { color: #d4a656; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏝️ RGFL SURVIVOR</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Reality Games Fantasy League</p>
      <p>You're receiving this because you're signed up for RGFL Survivor.</p>
      <p><a href="https://rgfl.app/profile/notifications" style="color:#d4a656;">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>
`;
}

export function button(text: string, url: string): string {
  return `<a href="${url}" class="btn">${text}</a>`;
}

export function statBox(value: string | number, label: string): string {
  return `
<div class="stat">
  <div class="stat-value">${value}</div>
  <div class="stat-label">${label}</div>
</div>
`;
}
