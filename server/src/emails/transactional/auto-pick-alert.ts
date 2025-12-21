import { emailWrapper, button } from '../base.js';

interface AutoPickAlertEmailParams {
  displayName: string;
  leagueName: string;
  castawayName: string;
  episodeNumber: number;
  leagueId: string;
}

export function autoPickAlertEmail({ displayName, leagueName, castawayName, episodeNumber, leagueId }: AutoPickAlertEmailParams): string {
  return emailWrapper(`
    <h1>⚠️ Auto-Pick Applied</h1>
    <p>Hey ${displayName},</p>
    <p>You missed the pick deadline for Episode ${episodeNumber} in <span class="highlight">${leagueName}</span>.</p>

    <div class="card" style="background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.3);">
      <p style="color: #fbbf24; margin: 0;"><strong>Auto-selected:</strong> ${castawayName}</p>
      <p style="color: #b8a; margin-top: 8px; margin-bottom: 0;">We automatically selected your highest-performing active castaway.</p>
    </div>

    ${button('View Your Team', `https://rgfl.app/leagues/${leagueId}/team`)}

    <div class="card">
      <h2>Don't Miss Future Picks!</h2>
      <p>📱 Enable SMS reminders for deadline alerts</p>
      <p>🔔 Turn on push notifications in your profile</p>
    </div>

    <p>Set a reminder for next week!</p>
  `, `Auto-pick alert: ${castawayName} was selected for Episode ${episodeNumber}`);
}
