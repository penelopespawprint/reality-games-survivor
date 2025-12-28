import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/global.css";

// Auth0 configuration with fallbacks
const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN || 'dev-w01qewse7es4d0ue.us.auth0.com';
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID || 'yAEo8VblIwCANCgujhSQPqRYTCORR1H8';
const auth0RedirectUri = import.meta.env.VITE_AUTH0_CALLBACK_URL || window.location.origin + '/callback';

// Log Auth0 config in development
if (import.meta.env.DEV) {
  console.log('Auth0 Config:', {
    domain: auth0Domain,
    clientId: auth0ClientId,
    redirectUri: auth0RedirectUri,
  });
}

const root = document.getElementById("root")!;
createRoot(root).render(
  <ErrorBoundary>
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: auth0RedirectUri
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </Auth0Provider>
  </ErrorBoundary>
);