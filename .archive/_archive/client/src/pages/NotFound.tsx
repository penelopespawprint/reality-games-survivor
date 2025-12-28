import React from "react";
import { Link } from "react-router-dom";

const NotFound: React.FC = () => (
  <main role="main" aria-label="Page not found" style={{
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #F3EED9 0%, #E8DCC8 100%)",
    padding: "2rem",
    textAlign: "center"
  }}>
    <div style={{ fontSize: "6rem", marginBottom: "1rem" }}>🏝️</div>
    <h1 style={{
      fontSize: "4rem",
      fontWeight: 900,
      color: "var(--brand-red)",
      fontFamily: "Impact, sans-serif",
      marginBottom: "0.5rem"
    }}>
      404
    </h1>
    <h2 style={{
      fontSize: "1.5rem",
      color: "var(--text-dark)",
      marginBottom: "1rem"
    }}>
      This page has been voted off the island
    </h2>
    <p style={{
      color: "var(--text-muted)",
      marginBottom: "2rem",
      maxWidth: "400px"
    }}>
      The page you're looking for doesn't exist. Maybe it found an idol and played it wrong?
    </p>
    <Link
      to="/"
      style={{
        padding: "1rem 2rem",
        background: "var(--brand-red)",
        color: "white",
        borderRadius: "8px",
        textDecoration: "none",
        fontWeight: 700,
        fontSize: "1rem",
        fontFamily: "Impact, sans-serif",
        textTransform: "uppercase"
      }}
    >
      Return to Camp
    </Link>
  </main>
);

export default NotFound;
