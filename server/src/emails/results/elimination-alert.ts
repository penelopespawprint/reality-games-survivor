import { emailWrapper, button } from '../base.js';

interface EliminationAlertEmailParams {
  displayName: string;
  leagueName: string;
  castawayName: string;
  episodeNumber: number;
  waiverOpensAt: string;
  leagueId: string;
}

export function eliminationAlertEmail({
  displayName,
  leagueName,
  castawayName,
  episodeNumber,
  waiverOpensAt,
  leagueId,
}: EliminationAlertEmailParams): string {
  return emailWrapper(`
    <h1>🔥 Castaway Eliminated</h1>
    <p>Hey ${displayName},</p>
    <p>Bad news from the island... <span style="color: #ef4444;">${castawayName}</span> has been voted out in Episode ${episodeNumber}.</p>

    <div class="card" style="text-align: center; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">
      <div style="font-size: 64px;">🔥</div>
      <p style="color: #ef4444; font-weight: bold; font-size: 24px; margin: 8px 0;">${castawayName}</p>
      <p style="color: #b8a; margin: 0;">The tribe has spoken.</p>
    </div>

    <div class="card">
      <h2>What Now?</h2>
      <p>The waiver wire opens <strong>${waiverOpensAt}</strong>. Submit your ranked preferences for available castaways to replace ${castawayName} on your roster.</p>
      <p style="color: #b8a; font-size: 14px;">Remember: Lower-ranked players in your league get priority on waiver claims!</p>
    </div>

    ${button('View Available Castaways', `https://rgfl.app/leagues/${leagueId}/waivers`)}

    <p>Don't give up - there's still plenty of game left to play!</p>
  `, `😢 ${castawayName} eliminated - waiver wire opens ${waiverOpensAt}`);
}
