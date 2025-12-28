import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setStatus("saving");
    setError(null);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setStatus("success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setStatus("error");
      setError(err?.response?.data?.error || "Invalid or expired reset token. Please request a new one.");
    }
  };

  return (
    <main role="main" aria-label="Reset password" className="rg-page" style={{ display: "grid", placeItems: "center" }}>
      <div className="rg-section" style={{ maxWidth: 420 }}>
        <h2 style={{ textAlign: "center", marginTop: 0 }}>Set a new password</h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
          Enter a new password for your Reality Games account.
        </p>
        <form onSubmit={onSubmit} aria-label="Reset password form" style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a secure password"
            required
            minLength={6}
          />
          <button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Reset password"}
          </button>
        </form>
        {status === "success" && (
          <div role="status" aria-live="polite" style={{ background: "#d4edda", color: "#155724", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
            <p style={{ margin: 0 }}>Password reset successfully! Redirecting to login...</p>
          </div>
        )}
        {status === "error" && <p role="alert" className="error">{error}</p>}
      </div>
    </main>
  );
};

export default ResetPassword;
