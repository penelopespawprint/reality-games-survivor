import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { routes } from "@/shared/routes";

const ForgotPassword: React.FC = () => {
  const { loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  // Redirect to Auth0 which handles password reset
  useEffect(() => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login'
      }
    });
  }, [loginWithRedirect]);

  return (
    <main role="main" aria-label="Password reset" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div className="rg-page" style={{ display: "grid", placeItems: "center", flex: 1 }}>
        <div className="rg-section" style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <img src="/images/logo/rgfl-logo.png" alt="RGFL Logo" style={{ height: "60px", width: "auto" }} />
          </div>
          <h2>Password Reset</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Redirecting to Auth0 for password reset...
          </p>
          <p style={{ marginTop: "1rem" }}>
            <a
              onClick={() => navigate(routes.login)}
              style={{ cursor: "pointer", color: "var(--brand-red)" }}
            >
              Return to login
            </a>
          </p>
        </div>
      </div>
    </main>
  );
};

export default ForgotPassword;
