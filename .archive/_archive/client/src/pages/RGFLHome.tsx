import React from "react";

/**
 * RGFL Master Splash Page
 * Simple landing for realitygamesfantasyleague.com
 * Links to show-specific subdomains (survivor, bigbrother, etc.)
 *
 * CEREBRO Skills: 56-70 (Marketing/Brand), 43-55 (Product/Growth)
 */
const RGFLHome: React.FC = () => {
  const survivorUrl = import.meta.env.VITE_SURVIVOR_URL || "https://survivor.realitygamesfantasyleague.com";

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .rgfl-hero {
          animation: fadeInUp 0.8s ease-out;
        }

        .show-card {
          animation: fadeInUp 0.8s ease-out;
          animation-fill-mode: both;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .show-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(164, 40, 40, 0.25);
        }

        .show-card.live {
          animation: pulse 2s ease-in-out infinite;
        }

        .show-card:nth-child(1) { animation-delay: 0.2s; }
        .show-card:nth-child(2) { animation-delay: 0.3s; }
        .show-card:nth-child(3) { animation-delay: 0.4s; }

        .coming-soon {
          position: relative;
          overflow: hidden;
        }

        .coming-soon::after {
          content: 'COMING SOON';
          position: absolute;
          top: 20px;
          right: -35px;
          background: var(--brand-red);
          color: white;
          padding: 0.25rem 2rem;
          font-size: 0.7rem;
          font-weight: 700;
          transform: rotate(45deg);
          letter-spacing: 0.05em;
        }
      `}</style>

      <main role="main" aria-label="Reality Games Fantasy League Home" style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Background texture */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(164, 40, 40, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(164, 40, 40, 0.08) 0%, transparent 40%)
          `,
          pointerEvents: "none"
        }} />

        {/* Hero Section */}
        <section className="rgfl-hero" style={{
          position: "relative",
          zIndex: 5,
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "6rem 2rem 4rem",
          textAlign: "center"
        }}>
          {/* Logo */}
          <div style={{ marginBottom: "2rem" }}>
            <img
              src="/images/logo/rgfl-logo.png"
              alt="Reality Games Fantasy League"
              style={{ height: "100px", width: "auto" }}
            />
          </div>

          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 900,
            color: "white",
            marginBottom: "1rem",
            lineHeight: 1.2,
            fontFamily: "Impact, 'Franklin Gothic Bold', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.02em"
          }}>
            Reality Games<br />
            <span style={{ color: "var(--brand-red)" }}>Fantasy League</span>
          </h1>

          <p style={{
            fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
            color: "rgba(255, 255, 255, 0.8)",
            maxWidth: "700px",
            margin: "0 auto 3rem",
            lineHeight: 1.7
          }}>
            The ultimate fantasy platform for reality TV fans.<br />
            Pick your players. Track the action. Dominate your league.
          </p>
        </section>

        {/* Shows Grid */}
        <section style={{
          position: "relative",
          zIndex: 5,
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "0 2rem 4rem"
        }}>
          <h2 style={{
            fontSize: "1.2rem",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.5)",
            textAlign: "center",
            marginBottom: "2rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em"
          }}>
            Choose Your Game
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem"
          }}>
            {/* Survivor - LIVE */}
            <a
              href={survivorUrl}
              className="show-card live"
              style={{
                display: "block",
                background: "linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)",
                padding: "2.5rem 2rem",
                borderRadius: "16px",
                border: "3px solid var(--brand-red)",
                textDecoration: "none",
                textAlign: "center",
                boxShadow: "0 8px 32px rgba(164, 40, 40, 0.2)"
              }}
            >
              <div style={{
                fontSize: "4rem",
                marginBottom: "1rem"
              }}>
                🔥
              </div>
              <div style={{
                display: "inline-block",
                background: "var(--brand-red)",
                color: "white",
                padding: "0.25rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.7rem",
                fontWeight: 700,
                marginBottom: "1rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Season 50 Registration Open
              </div>
              <h3 style={{
                fontSize: "1.8rem",
                fontWeight: 800,
                color: "white",
                marginBottom: "0.5rem",
                fontFamily: "Impact, sans-serif",
                textTransform: "uppercase"
              }}>
                Survivor
              </h3>
              <p style={{
                fontSize: "0.95rem",
                color: "rgba(255, 255, 255, 0.6)",
                lineHeight: 1.5
              }}>
                100+ scoring rules. Strategic draft. Real competition.
              </p>
            </a>

            {/* Big Brother - Coming Soon */}
            <div
              className="show-card coming-soon"
              style={{
                background: "linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)",
                padding: "2.5rem 2rem",
                borderRadius: "16px",
                border: "2px solid rgba(255, 255, 255, 0.1)",
                textAlign: "center",
                opacity: 0.6
              }}
            >
              <div style={{
                fontSize: "4rem",
                marginBottom: "1rem",
                filter: "grayscale(50%)"
              }}>
                🏠
              </div>
              <h3 style={{
                fontSize: "1.8rem",
                fontWeight: 800,
                color: "rgba(255, 255, 255, 0.5)",
                marginBottom: "0.5rem",
                fontFamily: "Impact, sans-serif",
                textTransform: "uppercase"
              }}>
                Big Brother
              </h3>
              <p style={{
                fontSize: "0.95rem",
                color: "rgba(255, 255, 255, 0.4)",
                lineHeight: 1.5
              }}>
                HOH, Veto, and evictions. Summer 2025.
              </p>
            </div>

            {/* The Challenge - Coming Soon */}
            <div
              className="show-card coming-soon"
              style={{
                background: "linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)",
                padding: "2.5rem 2rem",
                borderRadius: "16px",
                border: "2px solid rgba(255, 255, 255, 0.1)",
                textAlign: "center",
                opacity: 0.6
              }}
            >
              <div style={{
                fontSize: "4rem",
                marginBottom: "1rem",
                filter: "grayscale(50%)"
              }}>
                💪
              </div>
              <h3 style={{
                fontSize: "1.8rem",
                fontWeight: 800,
                color: "rgba(255, 255, 255, 0.5)",
                marginBottom: "0.5rem",
                fontFamily: "Impact, sans-serif",
                textTransform: "uppercase"
              }}>
                The Challenge
              </h3>
              <p style={{
                fontSize: "0.95rem",
                color: "rgba(255, 255, 255, 0.4)",
                lineHeight: 1.5
              }}>
                Daily challenges, eliminations, and finals.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          position: "relative",
          zIndex: 5,
          padding: "3rem 2rem",
          textAlign: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <img
            src="/images/logo/rgfl-logo.png"
            alt="RGFL"
            style={{ height: "40px", width: "auto", opacity: 0.5, marginBottom: "1rem" }}
          />
          <p style={{
            fontSize: "0.85rem",
            color: "rgba(255, 255, 255, 0.4)"
          }}>
            © 2025 Reality Games Fantasy League. All rights reserved.
          </p>
        </footer>
      </main>
    </>
  );
};

export default RGFLHome;
