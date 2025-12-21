import { emailWrapper, button } from '../base.js';

interface PickFinalWarningEmailParams {
  displayName: string;
  episodeNumber: number;
  minutesLeft: number;
  leagueId: string;
}

export function pickFinalWarningEmail({ displayName, episodeNumber, minutesLeft, leagueId }: PickFinalWarningEmailParams): string {
  return emailWrapper(`
    <h1>🚨 PICKS LOCK SOON!</h1>
    <p>Hey ${displayName},</p>
    <p>You have <span style="color: #ef4444; font-weight: bold;">${minutesLeft} minutes</span> to submit your pick for Episode ${episodeNumber}!</p>

    <div class="card" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: #ef4444;">${minutesLeft}m</div>
      <div style="color: #fbbf24; text-transform: uppercase; font-size: 12px;">UNTIL PICKS LOCK</div>
    </div>

    ${button('PICK NOW', `https://rgfl.app/leagues/${leagueId}/pick`)}

    <p style="color: #ef4444;">⚠️ After lockout, your highest-ranked castaway will be auto-selected!</p>
  `, `⚠️ ${minutesLeft} MINUTES: Make your Episode ${episodeNumber} pick NOW!`);
}
