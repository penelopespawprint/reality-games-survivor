import { emailWrapper, heading, paragraph, button, card, featureItem, spacer } from '../base.js';
export function welcomeEmail({ displayName }) {
    const content = `
    ${heading(`Welcome, ${displayName}!`)}
    
    ${paragraph(`Welcome to <strong>Reality Games Fantasy League</strong> — the ultimate Survivor fantasy experience. With 100+ scoring rules that reward real gameplay strategy, every episode is an opportunity to prove your Survivor knowledge.`)}

    ${card(`
      ${heading('Getting Started', 2)}
      ${featureItem('🏝️', 'Create or Join a League', 'Play with friends in a private league or compete in the global rankings.')}
      ${featureItem('🎯', 'Draft Your Castaways', 'Pick 2 castaways in the snake draft to build your team.')}
      ${featureItem('📊', 'Make Weekly Picks', 'Choose which castaway to play each episode for maximum points.')}
      ${featureItem('🏆', 'Dominate the Leaderboard', 'Climb the rankings and prove you\'re the ultimate Survivor fan.')}
    `)}

    ${button('Go to Dashboard', 'https://survivor.realitygamesfantasyleague.com/dashboard')}

    ${spacer()}
    ${paragraph(`Questions? Reply to this email for support.`, true)}
  `;
    return emailWrapper(content, 'Welcome to Reality Games: Survivor');
}
//# sourceMappingURL=welcome.js.map