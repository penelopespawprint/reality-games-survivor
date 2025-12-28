import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/shared/routes";

const Auth0Callback: React.FC = () => {
  const { isAuthenticated, isLoading: auth0Loading } = useAuth0();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for both Auth0 and our auth context to finish loading
    if (auth0Loading || loading) return;

    if (isAuthenticated && user) {
      // User is authenticated and synced - redirect based on role
      if (user.isAdmin) {
        navigate(routes.admin.index, { replace: true });
      } else {
        navigate(routes.dashboard, { replace: true });
      }
    } else if (!isAuthenticated) {
      // Auth0 says not authenticated - redirect to login
      navigate(routes.login, { replace: true });
    }
    // If isAuthenticated but no user yet, wait for sync to complete
  }, [isAuthenticated, auth0Loading, user, loading, navigate]);

  return (
    <main role="main" aria-label="Authentication" className="rg-page" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="loading-spinner" aria-hidden="true" style={{ margin: "2rem auto" }} />
        <h2>Signing you in...</h2>
        <p style={{ color: "var(--text-muted)" }}>Please wait while we complete authentication.</p>
      </div>
    </main>
  );
};

export default Auth0Callback;
