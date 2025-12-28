import React from "react";

const LeagueOverview: React.FC = () => {
  return (
    <main role="main" aria-label="League Overview" className="rg-page">
      <section className="rg-hero" aria-labelledby="league-title">
        <span className="rg-pill">League HQ</span>
        <h1 id="league-title">The one league to rule them all.</h1>
        <p>
          Every player joins the flagship Reality Games league. No caps, no tiers — just Survivor obsessives competing
          across a shared leaderboard all season long.
        </p>
      </section>

      <section className="rg-section" style={{ marginTop: "3rem" }}>
        <h2>Season Timeline</h2>
        <div className="rg-grid rg-grid--two">
          <article className="rg-card">
            <h3>Preseason</h3>
            <p>• Sign up and receive instant league placement.<br />• Rank all castaways 1–18.<br />• Wait for the admin to run the draft.</p>
          </article>
          <article className="rg-card">
            <h3>Weekly Cycle</h3>
            <p>• Picks open the morning after each episode.<br />• Lock 12 hours before the next episode.<br />• Scores post within 24 hours of airtime.</p>
          </article>
          <article className="rg-card">
            <h3>Playoffs? Nope.</h3>
            <p>It&apos;s a marathon, not a bracket. The leaderboard is cumulative from premiere to finale.</p>
          </article>
          <article className="rg-card">
            <h3>Champion&apos;s Circle</h3>
            <p>Season winners are immortalized on the Hall of Flame page (coming soon) and featured in the newsletter.</p>
          </article>
        </div>
      </section>
    </main>
  );
};

export default LeagueOverview;
