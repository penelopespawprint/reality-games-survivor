import React from "react";

const Rules: React.FC = () => {
  return (
    <main role="main" aria-label="Rules and Scoring" className="rg-page">
      <section className="rg-hero">
        <span className="rg-pill">Rules & Scoring</span>
        <h1>Over 100 Scoring Rules.</h1>
        <p>
          This league tracks more than 100 scoring triggers, refined each season. Rules are added, removed, or modified only between seasons — never mid-season — to keep gameplay fair.
        </p>
      </section>

      <section className="rg-section">
        <h2>Rule Categories</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1.5rem",
          maxWidth: "100%"
        }}>
          <div style={{
            aspectRatio: "1",
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "3px solid var(--brand-red)"
          }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "var(--brand-red)" }}>
              6
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Pre-Merge Team Challenges
            </div>
          </div>

          <div style={{
            aspectRatio: "1",
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "3px solid #3B82F6"
          }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#1E3A8A" }}>
              8
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Pre-Merge Tribal Council
            </div>
          </div>

          <div style={{
            aspectRatio: "1",
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "3px solid #F59E0B"
          }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#92400E" }}>
              18
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Post-Merge Individual
            </div>
          </div>

          <div style={{
            aspectRatio: "1",
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "3px solid #EF4444"
          }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#991B1B" }}>
              7
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Merge Tribal Council
            </div>
          </div>

          <div style={{
            aspectRatio: "1",
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "3px solid #10B981"
          }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#047857" }}>
              28
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Advantages Scoring
            </div>
          </div>

          <div style={{
            aspectRatio: "1",
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "3px solid #8B5CF6"
          }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#5B21B6" }}>
              22
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Hidden Immunity Idols
            </div>
          </div>

          <div style={{
            aspectRatio: "1",
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "3px solid #EC4899"
          }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#9F1239" }}>
              4
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Final Three
            </div>
          </div>

          <div style={{
            aspectRatio: "1",
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "3px solid #14B8A6"
          }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#115E59" }}>
              10
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Random Scoring
            </div>
          </div>

          <div style={{
            aspectRatio: "1",
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: "3px solid #6B7280"
          }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#4B5563" }}>
              —
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Retired Rules
            </div>
          </div>
        </div>
      </section>

      <section className="rg-section">
        <h2>Rule Examples</h2>
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>A taste of our detail level:</p>
        <div className="rg-card" style={{ background: "#f9fafb", padding: "1.5rem" }}>
          <ul style={{ paddingLeft: "1.5rem", display: "grid", gap: "0.75rem", margin: 0 }}>
            <li>Wardrobe malfunction (must be more than a quick blur)</li>
            <li>Player's background story told with home pictures or videos</li>
            <li>Crying or brink of tears</li>
            <li>Secret food theft</li>
            <li>Medical evaluation without evacuation</li>
          </ul>
        </div>
      </section>

      <section className="rg-section">
        <h2>Retired Rules</h2>
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>Some rules are retired as gameplay evolves but remain listed for history's sake:</p>
        <div className="rg-card" style={{ background: "#f9fafb", padding: "1.5rem" }}>
          <ul style={{ paddingLeft: "1.5rem", display: "grid", gap: "0.75rem", margin: 0 }}>
            <li>Finding a hidden immunity idol without a clue</li>
            <li>Inspiring a hashtag at the bottom of the screen</li>
            <li>Saving all Survivor auction money until the last item</li>
          </ul>
        </div>
      </section>

      <section className="rg-section">
        <h2>How to Play</h2>

        <h3>Pre-Season</h3>
        <ol style={{ paddingLeft: "1.5rem", display: "grid", gap: "1rem", marginBottom: "2rem" }}>
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

        <h3>During the Season</h3>
        <ol style={{ paddingLeft: "1.5rem", display: "grid", gap: "1rem", marginBottom: "2rem" }} start={4}>
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

        <h3>Quick Tips</h3>
        <ul style={{ paddingLeft: "1.5rem", display: "grid", gap: "0.75rem" }}>
          <li><strong>Rank early</strong> — rankings lock before the draft.</li>
          <li><strong>Make picks before the deadline</strong> each week.</li>
          <li><strong>Watch the leaderboard</strong> to plan your next move.</li>
        </ul>
      </section>
    </main>
  );
};

export default Rules;
