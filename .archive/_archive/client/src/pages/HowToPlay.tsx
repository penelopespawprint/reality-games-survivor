import React from "react";

const HowToPlay: React.FC = () => {
  return (
    <main className="rg-page" role="main" aria-label="How to Play">
      <section className="rg-hero" aria-labelledby="howto-title">
        <span className="rg-pill">How to Play</span>
        <h1 id="howto-title">Your Roadmap to Survivor Fantasy Glory</h1>
      </section>

      <section className="rg-section">
        <h2>🟡 Pre-Season</h2>
        <ol style={{ paddingLeft: "1.5rem", display: "grid", gap: "1rem" }}>
          <li>
            <strong>Enter the League:</strong> Everyone is automatically in the single global league.
          </li>
          <li>
            <strong>Rank the Castaways:</strong> Drag-and-drop contestants from most to least favorite before the season starts.
          </li>
          <li>
            <strong>Snake Draft Assignment:</strong> The app runs the draft using your rankings to assign you one or two contestants before episode one airs.
          </li>
        </ol>
      </section>

      <section className="rg-section">
        <h2>🟢 During the Season</h2>
        <ol style={{ paddingLeft: "1.5rem", display: "grid", gap: "1rem" }} start={4}>
          <li>
            <strong>Weekly Pick:</strong> Each week choose one of your contestants (if you have two) to represent you.
          </li>
          <li>
            <strong>Scoring:</strong> Earn points based on your contestant's performance that week; the app tallies automatically.
          </li>
          <li>
            <strong>Leaderboard:</strong> Track your position against all players in real time.
          </li>
          <li>
            <strong>Season Flow:</strong> This repeats every week (typically 13 episodes). The highest cumulative score at the end wins bragging rights as the Ultimate Survivor Fantasy Champion.
          </li>
        </ol>
      </section>

      <section className="rg-section">
        <h2>Quick Tips</h2>
        <ul style={{ paddingLeft: "1.5rem", display: "grid", gap: "0.75rem" }}>
          <li><strong>Rank early</strong> — rankings lock before the draft.</li>
          <li><strong>Make picks before the deadline</strong> each week.</li>
          <li><strong>Watch the leaderboard</strong> to plan your next move.</li>
        </ul>
      </section>
    </main>
  );
};

export default HowToPlay;
