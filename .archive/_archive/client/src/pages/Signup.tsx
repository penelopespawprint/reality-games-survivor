import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { routes } from "@/shared/routes";

const Signup: React.FC = () => {
  const { user, loading } = useAuth();
  const { loginWithRedirect, isLoading: auth0Loading } = useAuth0();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      if (user.isAdmin) {
        navigate(routes.admin.index);
      } else {
        navigate(routes.dashboard);
      }
    }
  }, [user, loading, navigate]);

  const handleSignup = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup'
      },
      appState: { returnTo: routes.preseasonRank }
    });
  };

  if (loading || auth0Loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div className="rg-page" style={{ display: "grid", placeItems: "center", flex: 1 }}>
          <div className="rg-section" style={{ maxWidth: 420, textAlign: "center" }}>
            <div className="loading-spinner" style={{ margin: "2rem auto" }} />
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main role="main" aria-label="Sign up" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div className="rg-page" style={{ display: "grid", placeItems: "center", flex: 1 }}>
        <div className="rg-section" style={{ maxWidth: 420 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <img src="/images/logo/rgfl-logo.png" alt="RGFL Logo" style={{ height: "60px", width: "auto" }} />
          </div>
          <h2 style={{ textAlign: "center", marginTop: 0 }}>Join RGFL</h2>
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Create your account to start playing Survivor Fantasy
          </p>

          <div style={{ marginTop: "2rem", display: "grid", gap: "1rem" }}>
            <button
              type="button"
              onClick={handleSignup}
              aria-label="Create a new account"
              style={{
                background: "linear-gradient(135deg, #ff6b35 0%, #d4542a 100%)",
                color: "white",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                padding: "1rem 1.5rem",
                fontWeight: 600,
                fontSize: "1rem",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(212, 80, 42, 0.3)"
              }}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="white"/>
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" fill="white"/>
              </svg>
              Create Account
            </button>

            <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#888" }}>
              Already have an account?{" "}
              <a
                onClick={() => navigate(routes.login)}
                style={{ cursor: "pointer", color: "var(--brand-red)", fontWeight: 600 }}
              >
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>

      <footer style={{
        padding: "2rem",
        textAlign: "center",
        fontSize: "0.9rem",
        color: "#666",
        borderTop: "1px solid #e5e5e5",
        background: "#f9f9f9"
      }}>
        <strong>Reality Games Fantasy League - Survivor</strong> is currently in Beta. Email{" "}
        <a
          href="mailto:support@realitygamesfantasyleague.com"
          style={{ color: "var(--brand-red)", textDecoration: "none", fontWeight: 600 }}
        >
          support@realitygamesfantasyleague.com
        </a>
        {" "}for access.
      </footer>
    </main>
  );
};

export default Signup;
