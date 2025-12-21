import { emailWrapper, button } from '../base.js';

interface WelcomeEmailParams {
  displayName: string;
}

export function welcomeEmail({ displayName }: WelcomeEmailParams): string {
  return emailWrapper(`
    <h1>Welcome to RGFL Survivor! 🎉</h1>
    <p>Hey ${displayName},</p>
    <p>You're now part of the most strategic Survivor fantasy league ever created. With 100+ scoring rules that reward real gameplay strategy, every episode is an opportunity to prove your Survivor knowledge.</p>

    <div class="card">
      <h2>Getting Started</h2>
      <p><strong>1. Create or join a league</strong> - Play with friends or join the global rankings</p>
      <p><strong>2. Draft your castaways</strong> - Pick 2 castaways in the snake draft</p>
      <p><strong>3. Make weekly picks</strong> - Choose who to play each episode</p>
      <p><strong>4. Dominate!</strong> - Climb the leaderboard and prove you're the ultimate fan</p>
    </div>

    ${button('Go to Dashboard', 'https://rgfl.app/dashboard')}

    <p>Questions? Reply to this email or check out our <a href="https://rgfl.app/how-to-play" style="color:#d4a656;">How to Play</a> guide.</p>

    <p>The tribe has spoken. Let's play!</p>
  `, 'Welcome to RGFL Survivor - your fantasy league adventure begins!');
}
