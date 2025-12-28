import React from "react";
import { Link } from "react-router-dom";

const ServerError: React.FC = () => (
  <main role="main" aria-label="Server Error" style={{
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #F3EED9 0%, #E8DCC8 100%)",
    padding: "2rem",
    textAlign: "center"
  }}>
    <div style={{ fontSize: "6rem", marginBottom: "1rem" }}>🔥</div>
    <h1 style={{
      fontSize: "4rem",
      fontWeight: 900,
      color: "var(--brand-red)",
      fontFamily: "Impact, sans-serif",
      marginBottom: "0.5rem"
    }}>
      500
    </h1>
    <h2 style={{
      fontSize: "1.5rem",
      color: "var(--text-dark)",
      marginBottom: "1rem"
    }}>
      The tribe has spoken... something went wrong
    </h2>
    <p style={{
      color: "var(--text-muted)",
      marginBottom: "2rem",
      maxWidth: "400px"
    }}>
      We're working to fix this. Please try again in a moment.
    </p>
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "1rem 2rem",
          background: "var(--brand-red)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontWeight: 700,
          fontSize: "1rem",
          fontFamily: "Impact, sans-serif",
          textTransform: "uppercase",
          cursor: "pointer"
        }}
      >
        Try Again
      </button>
      <Link
        to="/"
        style={{
          padding: "1rem 2rem",
          background: "white",
          color: "var(--brand-red)",
          border: "2px solid var(--brand-red)",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "1rem",
          fontFamily: "Impact, sans-serif",
          textTransform: "uppercase"
        }}
      >
        Return Home
      </Link>
    </div>
  </main>
);

export default ServerError;
