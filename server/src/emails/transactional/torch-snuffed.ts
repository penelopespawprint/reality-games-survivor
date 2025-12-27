import { emailWrapper, button, card, heading, paragraph } from '../base.js';

interface TorchSnuffedEmailParams {
  displayName: string;
  leagueName: string;
  leagueId: string;
  episodeNumber: number;
}

export function torchSnuffedEmail({
  displayName,
  leagueName,
  leagueId,
  episodeNumber
}: TorchSnuffedEmailParams): string {
  return emailWrapper(`
    ${heading('Your Torch Has Been Snuffed', 1, 'error')}
    ${paragraph(`Hey ${displayName},`)}
    ${paragraph('The tribe has spoken.')}

    ${card(`
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 64px; margin-bottom: 16px;">🔥</div>
        <p style="font-family: Georgia, serif; color: #DC2626; font-weight: 700; font-size: 24px; margin: 16px 0 8px 0;">
          Both your castaways have been eliminated
        </p>
        <p style="color: #991B1B; margin: 8px 0 0 0; font-style: italic; font-size: 16px;">
          You can no longer compete in ${leagueName}
        </p>
      </div>
    `, 'error')}

    ${card(`
      ${heading('What This Means', 2)}
      ${paragraph('Both castaways on your roster have been voted out. With no active players remaining, you cannot make picks for Episode ${episodeNumber} or future episodes this season.')}
      ${paragraph('You can still:')}
      ${paragraph('✓ Watch the leaderboard and standings')}
      ${paragraph('✓ Participate in league chat and discussions')}
      ${paragraph('✓ Join other leagues for the season (if spots are available)')}
    `)}

    ${button('View League Standings', `https://rgfl.app/leagues/${leagueId}/standings`)}

    ${card(`
      <div style="text-align: center;">
        <div style="font-size: 20px; margin-bottom: 12px;">📺 Keep Watching!</div>
        ${paragraph('Even though your game is over, you can still follow along as the season unfolds. Better luck next season!')}
      </div>
    `)}

    ${paragraph(`<em style="color: #8A7654; text-align: center; display: block;">"The tribe has spoken."</em>`)}
  `, `Your torch has been snuffed in ${leagueName}`, 'tribal_council');
}
