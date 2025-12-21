import { emailWrapper, button } from '../base.js';

interface PickReminderEmailParams {
  displayName: string;
  episodeNumber: number;
  episodeTitle?: string;
  hoursLeft: number;
  leagueId: string;
}

export function pickReminderEmail({ displayName, episodeNumber, episodeTitle, hoursLeft, leagueId }: PickReminderEmailParams): string {
  const episodeText = episodeTitle ? `Episode ${episodeNumber}: "${episodeTitle}"` : `Episode ${episodeNumber}`;

  return emailWrapper(`
    <h1>⏰ Make Your Pick!</h1>
    <p>Hey ${displayName},</p>
    <p>You haven't submitted your pick for <span class="highlight">${episodeText}</span> yet!</p>

    <div class="card" style="text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: #d4a656;">${hoursLeft}h</div>
      <div style="color: #b8a; text-transform: uppercase; font-size: 12px;">Until Picks Lock</div>
    </div>

    ${button('Make Your Pick', `https://rgfl.app/leagues/${leagueId}/pick`)}

    <p style="color: #b8a;">Can't decide? Pick your castaway with the most favorable matchup this week!</p>
  `, `${hoursLeft} hours left to make your pick for Episode ${episodeNumber}`);
}
