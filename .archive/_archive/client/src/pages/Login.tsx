import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { routes } from "@/shared/routes";
import { PageLoader } from "@/components/TorchLoader";

const Login: React.FC = () => {
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

  const handleLogin = () => {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname }
    });
  };

  if (loading || auth0Loading) {
    return <PageLoader />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <main className="rg-page" style={{ display: "grid", placeItems: "center", flex: 1 }} role="main" aria-label="Login page">
        <div className="rg-section" style={{ maxWidth: 420 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <img src="/images/logo/rgfl-logo.png" alt="RGFL" style={{ height: "60px", width: "auto" }} />
          </div>
          <h2 style={{ textAlign: "center", marginTop: 0 }}>Welcome to RGFL</h2>
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Log in to set your weekly picks and track the leaderboard.
          </p>

          <div style={{ marginTop: "2rem", display: "grid", gap: "1rem" }}>
            <button
              type="button"
              onClick={handleLogin}
              aria-label="Sign in or create an account"
              style={{
                background: "var(--brand-red)",
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
                cursor: "pointer"
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="white"/>
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" fill="white"/>
              </svg>
              Sign In / Sign Up
            </button>

            <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#888" }}>
              We use Auth0 for secure authentication. No password to remember.
            </p>
          </div>
        </div>
      </main>

      <footer style={{
        padding: "2rem",
        textAlign: "center",
        fontSize: "0.9rem",
        color: "#666",
        borderTop: "1px solid #e5e5e5",
        background: "#f9f9f9"
      }}>
        <strong>Reality Games Fantasy League - Survivor</strong> is currently in Beta only. Email{" "}
        <a
          href="mailto:support@realitygamesfantasyleague.com"
          style={{ color: "var(--brand-red)", textDecoration: "none", fontWeight: 600 }}
        >
          support@realitygamesfantasyleague.com
        </a>
        {" "}to participate.
      </footer>
    </div>
  );
};

export default Login;
