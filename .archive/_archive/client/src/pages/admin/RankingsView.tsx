import React, { useEffect, useState } from "react";
import api from "@/lib/api";

interface Castaway {
  id: string;
  name: string;
}

interface RankingEntry {
  position: number;
  castawayId: string;
  castaway: Castaway;
}

interface UserRanking {
  user: { id: string; name: string; email: string };
  submittedAt: string;
  entries: RankingEntry[];
}

const RankingsView: React.FC = () => {
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [runningDraft, setRunningDraft] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [draftStatus, setDraftStatus] = useState<string>("PENDING");
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const fetchData = () => {
    Promise.all([
      api.get("/api/rankings/admin/overview"),
      api.get("/api/league"),
      api.get("/api/users")
    ])
      .then(([rankingsRes, leagueRes, usersRes]) => {
        setRankings(rankingsRes.data);
        setDraftStatus(leagueRes.data.draftStatus);
        setAllUsers(usersRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 10 seconds to show new rankings submissions
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUnlockDraft = async () => {
    if (!confirm("Are you sure you want to unlock the draft? This will allow users to edit their rankings again.")) {
      return;
    }

    setUnlocking(true);
    setMessage(null);
    try {
      await api.post("/api/rankings/admin/unlock");
      setMessage({ type: "success", text: "Rankings unlocked successfully! Users can now edit their rankings." });
    } catch (error: any) {
      console.error("Failed to unlock rankings:", error);
      setMessage({ type: "error", text: error?.response?.data?.error ?? "Failed to unlock rankings" });
    } finally {
      setUnlocking(false);
    }
  };

  const handleRunSnakeDraft = async () => {
    if (!confirm("Are you sure you want to run the snake draft? This will assign castaways based on user rankings.")) {
      return;
    }

    setRunningDraft(true);
    setMessage(null);
    try {
      await api.post("/api/draft/run");
      setMessage({ type: "success", text: "Snake draft completed successfully! Castaways have been assigned to players." });
    } catch (error: any) {
      console.error("Failed to run draft:", error);
      setMessage({ type: "error", text: error?.response?.data?.error ?? "Failed to run snake draft" });
    } finally {
      setRunningDraft(false);
    }
  };

  const exportToCSV = () => {
    if (rankings.length === 0) return;

    // Build CSV headers - include all 18 positions
    const headers = ["Player Name", "Player Email", "Submitted At"];
    for (let i = 1; i <= 18; i++) {
      headers.push(`Rank ${i}`);
    }

    // Build CSV rows
    const rows = rankings.map((ranking) => {
      const row = [
        ranking.user.name,
        ranking.user.email,
        new Date(ranking.submittedAt).toLocaleString()
      ];

      // Add each castaway in order
      for (let i = 1; i <= 18; i++) {
        const entry = ranking.entries.find((e) => e.position === i);
        row.push(entry ? entry.castaway.name : "");
      }

      return row;
    });

    // Combine into CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rankings-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="rg-page">
        <div className="loading">Loading rankings...</div>
      </div>
    );
  }

  return (
    <main role="main" aria-label="Rankings View" className="rg-page">
      <section className="rg-hero" aria-labelledby="rankings-title">
        <span className="rg-pill">Admin</span>
        <h1 id="rankings-title">Player Rankings Overview</h1>
        <p>View all player rankings from 1-18 and export to CSV</p>
      </section>

      <section className="rg-section">
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <button
            onClick={handleUnlockDraft}
            disabled={unlocking}
            style={{ background: "#f59e0b" }}
          >
            {unlocking ? "Unlocking..." : "Unlock Draft"}
          </button>
          <button
            onClick={handleRunSnakeDraft}
            disabled={runningDraft}
            style={{ background: "#10b981" }}
          >
            {runningDraft ? "Running..." : "Start Snake Draft"}
          </button>
        </div>

        {message && (
          <div style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            background: message.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${message.type === "success" ? "#22c55e" : "#ef4444"}`,
            borderRadius: "var(--radius-md)",
            color: message.type === "success" ? "#166534" : "#991b1b"
          }}>
            {message.text}
          </div>
        )}

        {/* Draft Status & Player Submission Summary */}
        <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "#f9f9f9", borderRadius: "12px", border: "2px solid #e5e5e5" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem" }}>Draft Status & Player Submissions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
            <div style={{ padding: "1rem", background: draftStatus === "COMPLETED" ? "rgba(34, 197, 94, 0.1)" : "rgba(249, 115, 22, 0.1)", borderRadius: "8px", border: `2px solid ${draftStatus === "COMPLETED" ? "#22c55e" : "#f97316"}` }}>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>Draft Status</p>
              <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: draftStatus === "COMPLETED" ? "#22c55e" : "#f97316" }}>
                {draftStatus === "COMPLETED" ? "🔒 Locked" : "🔓 Unlocked"}
              </p>
            </div>
            <div style={{ padding: "1rem", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", border: "2px solid #3b82f6" }}>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>Total Signed Up</p>
              <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6" }}>
                {allUsers.length} Players
              </p>
            </div>
            <div style={{ padding: "1rem", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px", border: "2px solid #22c55e" }}>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>Submitted Rankings</p>
              <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#22c55e" }}>
                {rankings.length} / {allUsers.length}
              </p>
            </div>
            <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "2px solid #ef4444" }}>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>Not Submitted</p>
              <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>
                {allUsers.length - rankings.length} Players
              </p>
            </div>
          </div>
          {allUsers.length - rankings.length > 0 && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(239, 68, 68, 0.05)", borderRadius: "8px" }}>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 600, color: "#991b1b" }}>Players who haven't submitted:</p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
                {allUsers.filter(u => !rankings.some(r => r.user.email === u.email)).map(u => u.name).join(", ")}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0 }}>All Player Rankings ({rankings.length})</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={fetchData} style={{ background: "#6b7280" }}>
              🔄 Refresh
            </button>
            <button onClick={exportToCSV} disabled={rankings.length === 0}>
              Export to CSV
            </button>
          </div>
        </div>

        {rankings.length === 0 ? (
          <p>No rankings submitted yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Submitted</th>
                  <th colSpan={18}>Rankings (1-18)</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((ranking) => (
                  <tr key={ranking.user.id}>
                    <td>
                      <strong>{ranking.user.name}</strong>
                      <div style={{ fontSize: "0.85rem", color: "#666" }}>{ranking.user.email}</div>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {new Date(ranking.submittedAt).toLocaleDateString()}
                    </td>
                    {Array.from({ length: 18 }, (_, i) => {
                      const entry = ranking.entries.find((e) => e.position === i + 1);
                      return (
                        <td key={i} style={{ fontSize: "0.85rem", minWidth: "120px" }}>
                          {entry ? entry.castaway.name : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rg-section">
        <h2>Quick Stats</h2>
        <div className="rg-grid rg-grid--three">
          <div className="rg-card">
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Total Submissions</h3>
            <p style={{ fontSize: "2rem", fontWeight: "600", margin: 0, color: "var(--brand-red)" }}>
              {rankings.length}
            </p>
          </div>
          <div className="rg-card">
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Most Recent</h3>
            <p style={{ margin: 0 }}>
              {rankings.length > 0
                ? new Date(
                    Math.max(...rankings.map((r) => new Date(r.submittedAt).getTime()))
                  ).toLocaleString()
                : "N/A"}
            </p>
          </div>
          <div className="rg-card">
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Oldest</h3>
            <p style={{ margin: 0 }}>
              {rankings.length > 0
                ? new Date(
                    Math.min(...rankings.map((r) => new Date(r.submittedAt).getTime()))
                  ).toLocaleString()
                : "N/A"}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default RankingsView;
