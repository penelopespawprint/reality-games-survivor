import React from "react";

const About: React.FC = () => {
  return (
    <main className="rg-page" role="main" aria-label="About Us">
      <section className="rg-hero" aria-labelledby="about-title">
        <span className="rg-pill">About Us</span>
        <h1 id="about-title">Built by Survivor Superfans</h1>
        <p>
          We've built the most comprehensive rule set for Survivor fantasy play. We're a small but dedicated team of Survivor enthusiasts who have run a rules-heavy fantasy league for more than a decade. What began as a humble spreadsheet and a shared obsession has evolved into a full scoring system that captures every twist, challenge, and advantage of the game.
        </p>
      </section>

      <section className="rg-section">
        <h2>Our Journey</h2>
        <div className="rg-grid" style={{ gap: "2rem" }}>
          <div className="rg-card">
            <h3>🔥 2000 – First Season Watched</h3>
            <p>It all started with Richard Hatch outwitting, outplaying, and outlasting the competition.</p>
          </div>
          <div className="rg-card">
            <h3>📊 2010 – First League</h3>
            <p>A group of friends turned their Survivor obsession into a competitive fantasy league with custom scoring rules.</p>
          </div>
          <div className="rg-card">
            <h3>🚀 2025 – Public Launch</h3>
            <p>After years of refinement, we're bringing our fantasy league system to the Survivor community.</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;
