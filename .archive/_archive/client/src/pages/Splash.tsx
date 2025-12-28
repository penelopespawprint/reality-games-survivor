import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { routes } from "@/shared/routes";

/**
 * Survivor Fantasy League - Season 50 Landing
 * Clean, minimal design following CEREBRO UI/UX principles:
 * - Visual hierarchy with clear primary action
 * - 8pt grid spacing system
 * - High contrast, accessible colors
 * - Progressive reveal animation
 */
const Splash: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(user.isAdmin ? routes.admin.index : routes.dashboard);
    }
  }, [user, navigate]);

  // Simple fade-in after initial render
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        .splash {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(180deg, #1a1a1a 0%, #2d1a1a 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          box-sizing: border-box;
        }

        .splash-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          max-width: 400px;
          width: 100%;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        .splash-content.ready {
          opacity: 1;
          transform: translateY(0);
        }

        /* Logo */
        .splash-logo {
          width: 100%;
          max-width: 280px;
        }

        .splash-logo img {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Season badge */
        .splash-season {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(164, 40, 40, 0.15);
          border: 1px solid rgba(164, 40, 40, 0.3);
          padding: 8px 16px;
          border-radius: 999px;
          color: #FF776C;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .splash-season::before {
          content: "🔥";
          font-size: 16px;
        }

        /* Tagline */
        .splash-tagline {
          color: rgba(255, 255, 255, 0.7);
          font-size: 18px;
          line-height: 1.5;
          text-align: center;
          margin: 0;
          font-weight: 400;
        }

        /* CTA Section */
        .splash-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
        }

        .splash-button {
          width: 100%;
          background: #A42828;
          color: #fff;
          border: none;
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .splash-button:hover {
          background: #8a2020;
          transform: translateY(-2px);
        }

        .splash-button:active {
          transform: translateY(0);
        }

        .splash-login {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }

        .splash-login a {
          color: #FF776C;
          text-decoration: none;
          font-weight: 500;
        }

        .splash-login a:hover {
          text-decoration: underline;
        }

        /* Mobile adjustments */
        @media (max-width: 480px) {
          .splash {
            padding: 24px 16px;
          }

          .splash-content {
            gap: 32px;
          }

          .splash-logo {
            max-width: 220px;
          }

          .splash-tagline {
            font-size: 16px;
          }

          .splash-button {
            padding: 14px 24px;
          }
        }
      `}</style>

      <main role="main" aria-label="Survivor Fantasy League" className="splash">
        <div className={`splash-content ${isReady ? "ready" : ""}`}>
          {/* Logo */}
          <div className="splash-logo">
            <img
              src="/images/logo/rgfl-logo.png"
              alt="Reality Games Fantasy League"
            />
          </div>

          {/* Season badge */}
          <span className="splash-season">Season 50</span>

          {/* Tagline */}
          <p className="splash-tagline">
            The ultimate fantasy experience for Survivor superfans.
          </p>

          {/* CTA */}
          <div className="splash-cta">
            <button
              className="splash-button"
              onClick={() => navigate(routes.signup)}
            >
              Register Now
            </button>
            <p className="splash-login">
              Already have an account?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); navigate(routes.login); }}>
                Sign in
              </a>
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default Splash;
