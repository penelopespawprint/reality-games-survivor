import React, { useEffect, useState } from "react";
import api from "@/lib/api";

interface DraftPickRow {
  id: string;
  round: number;
  pickNumber: number;
  user: { id: string; name: string; email: string };
  castaway: { id: string; name: string; tribe?: string | null };
}

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

interface WeeklyPick {
  id: string;
  weekNumber: number;
  submittedAt: string;
  user: { id: string; name: string; email: string };
  castaway: { id: string; name: string; tribe?: string | null };
  week: { weekNumber: number; picksCloseAt?: string | null };
}

interface PickStatus {
  userId: string;
  userName: string;
  userEmail: string;
  hasSubmitted: boolean;
}

interface Week {
  id: string;
  weekNumber: number;
  isActive: boolean;
}

const PicksManager = () => {
  const [status, setStatus] = useState<"PENDING" | "IN_PROGRESS" | "COMPLETED" | "UNKNOWN">("UNKNOWN");
  const [picks, setPicks] = useState<DraftPickRow[]>([]);
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [previewPicks, setPreviewPicks] = useState<DraftPickRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [weeklyPicks, setWeeklyPicks] = useState<WeeklyPick[]>([]);
  const [showWeeklyLog, setShowWeeklyLog] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showAdminPicker, setShowAdminPicker] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [userDraftPicks, setUserDraftPicks] = useState<any[]>([]);
  const [selectedCastaway, setSelectedCastaway] = useState<string>("");
  const [submittingPick, setSubmittingPick] = useState(false);
  const [pickStatus, setPickStatus] = useState<PickStatus[]>([]);
  const [activeWeek, setActiveWeek] = useState<Week | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [statusRes, rankingsRes, leagueRes, usersRes, weeksRes] = await Promise.all([
        api.get("/api/draft/status"),
        api.get("/api/rankings/admin/overview"),
        api.get("/api/league"),
        api.get("/api/users"),
        api.get("/api/admin/weeks")
      ]);

      setStatus(statusRes.data.draftStatus ?? leagueRes.data.draftStatus ?? "UNKNOWN");
      setPicks(statusRes.data.picks ?? []);
      setRankings(rankingsRes.data);
      setAllUsers(usersRes.data);
      setMessage(null);

      // Load active week and pick status
      const users = usersRes.data;
      const activeWeekData = weeksRes.data.find((w: Week) => w.isActive);
      setActiveWeek(activeWeekData || null);

      if (activeWeekData && users.length > 0) {
        const picksRes = await api.get(`/api/picks/week/${activeWeekData.weekNumber}`);
        const picks = picksRes.data;

        const statusData = users.map((user: any) => ({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          hasSubmitted: picks.some((p: any) => p.userId === user.id)
        }));

        setPickStatus(statusData);
      }
    } catch (error) {
      console.error("Failed to load draft data:", error);
      setMessage("Unable to load draft data");
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyPicks = async () => {
    try {
      const res = await api.get("/api/picks/admin/log");
      setWeeklyPicks(res.data.picks ?? []);
    } catch (error) {
      console.error("Failed to load weekly picks log:", error);
    }
  };

  const loadDebugInfo = async () => {
    try {
      const res = await api.get("/api/picks/admin/debug");
      setDebugInfo(res.data);
    } catch (error) {
      console.error("Failed to load debug info:", error);
    }
  };

  const loadUserDraftPicks = async (userId: string) => {
    if (!userId) {
      setUserDraftPicks([]);
      return;
    }
    try {
      const res = await api.get("/api/draft/status");
      const userPicks = res.data.picks?.filter((p: any) => p.userId === userId) || [];
      setUserDraftPicks(userPicks);
    } catch (error) {
      console.error("Failed to load user draft picks:", error);
      setUserDraftPicks([]);
    }
  };

  const handleUserChange = (userId: string) => {
    setSelectedUser(userId);
    setSelectedCastaway("");
    loadUserDraftPicks(userId);
  };

  const submitPickForUser = async () => {
    if (!selectedUser || !selectedCastaway) {
      alert("Please select both a user and a castaway");
      return;
    }

    setSubmittingPick(true);
    try {
      await api.post("/api/picks/admin/submit", {
        userId: selectedUser,
        castawayId: selectedCastaway
      });

      setMessage(`✅ Pick submitted successfully for ${allUsers.find(u => u.id === selectedUser)?.name}!`);
      setSelectedUser("");
      setSelectedCastaway("");
      setUserDraftPicks([]);

      // Reload weekly picks log if visible
      if (showWeeklyLog) {
        await loadWeeklyPicks();
      }
    } catch (error: any) {
      console.error("Failed to submit pick:", error);
      setMessage(`❌ ${error?.response?.data?.error || "Failed to submit pick"}`);
    } finally {
      setSubmittingPick(false);
    }
  };

  useEffect(() => {
    loadStatus();

    // Auto-refresh every 15 seconds to show new submissions
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const previewDraft = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.post("/api/draft/preview");
      setPreviewPicks(res.data.picks ?? []);
      setShowPreview(true);
      setMessage("Draft preview generated - review and approve below");
    } catch (error: any) {
      console.error("Failed to preview draft:", error);
      setMessage(error?.response?.data?.error ?? "Unable to preview draft");
    } finally {
      setLoading(false);
    }
  };

  const approveDraft = async () => {
    console.log("[PicksManager] approveDraft called");
    if (!window.confirm("Approve this draft? This will finalize the picks for all players.")) {
      console.log("[PicksManager] User cancelled confirmation");
      return;
    }

    console.log("[PicksManager] Calling /api/draft/run");
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.post("/api/draft/run");
      console.log("[PicksManager] Draft run response:", res.data);
      setStatus("COMPLETED");
      setPicks(res.data.picks ?? []);
      setShowPreview(false);
      setMessage("Draft completed and approved successfully!");
      await loadStatus();
    } catch (error: any) {
      console.error("Failed to run draft:", error);
      console.error("Error details:", error?.response?.data);
      setMessage(error?.response?.data?.error ?? "Unable to run draft");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockDraft = async () => {
    if (!confirm("Are you sure you want to unlock the draft? This will allow users to edit their rankings again.")) {
      return;
    }

    setUnlocking(true);
    setMessage(null);
    try {
      await api.post("/api/rankings/admin/unlock");
      setMessage("Rankings unlocked successfully! Users can now edit their rankings.");
      await loadStatus();
    } catch (error: any) {
      console.error("Failed to unlock rankings:", error);
      setMessage(error?.response?.data?.error ?? "Failed to unlock rankings");
    } finally {
      setUnlocking(false);
    }
  };

  const exportToCSV = () => {
    if (rankings.length === 0) return;

    const headers = ["Player Name", "Player Email", "Submitted At"];
    for (let i = 1; i <= 18; i++) {
      headers.push(`Rank ${i}`);
    }

    const rows = rankings.map((ranking) => {
      const row = [
        ranking.user.name,
        ranking.user.email,
        new Date(ranking.submittedAt).toLocaleString()
      ];

      for (let i = 1; i <= 18; i++) {
        const entry = ranking.entries.find((e) => e.position === i);
        row.push(entry ? entry.castaway.name : "");
      }

      return row;
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

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

  if (loading && rankings.length === 0) {
    return (
      <div className="rg-page">
        <section className="rg-hero">
          <span className="rg-pill">Draft Manager</span>
          <h1>Loading draft data...</h1>
        </section>
      </div>
    );
  }

  const submittedCount = pickStatus.filter(s => s.hasSubmitted).length;
  const notSubmittedCount = pickStatus.filter(s => !s.hasSubmitted).length;

  return (
    <main role="main" aria-label="Picks Manager" className="rg-page">
      <section className="rg-hero" aria-labelledby="picks-mgr-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="rg-pill">Draft Manager</span>
            <h1 id="picks-mgr-title">Player Rankings & Snake Draft</h1>
            <p>View rankings, preview, and execute the snake draft when ready</p>
          </div>
          <button onClick={loadStatus} style={{ background: "#6b7280", marginTop: "1rem" }}>
            🔄 Refresh
          </button>
        </div>
      </section>

      {/* Weekly Pick Status Widget */}
      {activeWeek && (
        <section style={{
          background: "white",
          borderRadius: "12px",
          padding: "2rem",
          marginBottom: "2.5rem",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e5e5e5"
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}>
            <div style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>📊</div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1f2937" }}>
              Week {activeWeek.weekNumber} Pick Status
            </h2>
          </div>

          {/* Count boxes - horizontal layout matching person boxes */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{
              background: "white",
              border: "2px solid #22c55e",
              borderRadius: "6px",
              backgroundColor: "rgba(34, 197, 94, 0.05)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              aspectRatio: "1.5 / 1",
              padding: "1rem",
              minWidth: "120px"
            }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#22c55e", marginBottom: "0.25rem" }}>
                {submittedCount}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Submitted</div>
            </div>

            <div style={{
              background: "white",
              border: "2px solid #f59e0b",
              borderRadius: "6px",
              backgroundColor: "rgba(245, 158, 11, 0.05)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              aspectRatio: "1.5 / 1",
              padding: "1rem",
              minWidth: "120px"
            }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#f59e0b", marginBottom: "0.25rem" }}>
                {notSubmittedCount}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Pending</div>
            </div>
          </div>

          {pickStatus.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "3rem",
              background: "#f9f9f9",
              borderRadius: "8px",
              color: "#999",
              fontSize: "1rem"
            }}>
              <p>No players loaded yet</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", fontWeight: 600 }}>✅ Submitted ({submittedCount})</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "0.5rem" }}>
                  {pickStatus
                    .filter(s => s.hasSubmitted)
                    .map(s => (
                      <div key={s.userId} style={{
                        background: "white",
                        border: "2px solid #22c55e",
                        borderRadius: "6px",
                        backgroundColor: "rgba(34, 197, 94, 0.05)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        aspectRatio: "1",
                        padding: "0.5rem"
                      }}>
                        <strong style={{ fontSize: "0.75rem", wordBreak: "break-word", color: "#1f2937" }}>{s.userName}</strong>
                      </div>
                    ))}
                  {submittedCount === 0 && (
                    <div style={{
                      background: "white",
                      border: "2px solid #ccc",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      aspectRatio: "1",
                      color: "#999",
                      fontStyle: "italic",
                      fontSize: "0.7rem"
                    }}>
                      No submissions yet
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", fontWeight: 600 }}>⏳ Pending ({notSubmittedCount})</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "0.5rem" }}>
                  {pickStatus
                    .filter(s => !s.hasSubmitted)
                    .map(s => (
                      <div key={s.userId} style={{
                        background: "white",
                        border: "2px solid #f59e0b",
                        borderRadius: "6px",
                        backgroundColor: "rgba(245, 158, 11, 0.05)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        aspectRatio: "1",
                        padding: "0.5rem"
                      }}>
                        <strong style={{ fontSize: "0.75rem", wordBreak: "break-word", color: "#1f2937" }}>{s.userName}</strong>
                      </div>
                    ))}
                  {notSubmittedCount === 0 && (
                    <div style={{
                      background: "white",
                      border: "2px solid #ccc",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      aspectRatio: "1",
                      color: "#999",
                      fontStyle: "italic",
                      fontSize: "0.7rem"
                    }}>
                      All submitted
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Admin Pick Submission */}
      <section className="rg-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>Submit Pick for User</h2>
          <button
            onClick={() => setShowAdminPicker(!showAdminPicker)}
            style={{ background: "#3b82f6" }}
          >
            {showAdminPicker ? "Hide Picker" : "Show Picker"}
          </button>
        </div>

        {showAdminPicker && (
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "8px", border: "2px solid #e5e7eb" }}>
            <div style={{ display: "grid", gap: "1.5rem", maxWidth: "600px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Select User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => handleUserChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "4px",
                    border: "2px solid #e5e7eb",
                    fontSize: "1rem"
                  }}
                >
                  <option value="">-- Choose a player --</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && userDraftPicks.length > 0 && (
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem" }}>
                    Select Castaway (from their draft picks)
                  </label>
                  <select
                    value={selectedCastaway}
                    onChange={(e) => setSelectedCastaway(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "4px",
                      border: "2px solid #e5e7eb",
                      fontSize: "1rem"
                    }}
                  >
                    <option value="">-- Choose a castaway --</option>
                    {userDraftPicks.map((pick) => (
                      <option key={pick.id} value={pick.castawayId}>
                        {pick.castaway?.name} (Round {pick.round})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedUser && userDraftPicks.length === 0 && (
                <p style={{ color: "#991b1b", fontStyle: "italic" }}>
                  This user has no draft picks assigned yet. Complete the draft first.
                </p>
              )}

              {selectedUser && selectedCastaway && (
                <button
                  onClick={submitPickForUser}
                  disabled={submittingPick}
                  style={{
                    background: "#22c55e",
                    opacity: submittingPick ? 0.5 : 1,
                    cursor: submittingPick ? "not-allowed" : "pointer"
                  }}
                >
                  {submittingPick ? "Submitting..." : "Submit Pick"}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Draft Status Summary */}
      <section className="rg-section">
        <h2>Draft Status & Submissions</h2>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            border: status === "COMPLETED" ? "2px solid #22c55e" : "2px solid #f97316",
            flex: "1 1 200px"
          }}>
            <div style={{ fontSize: "1.5rem" }}>
              {status === "COMPLETED" ? "🔒" : "🔓"}
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Status</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: status === "COMPLETED" ? "#22c55e" : "#f97316" }}>
                {status === "COMPLETED" ? "Locked" : "Open"}
              </div>
            </div>
          </div>

          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            border: "2px solid #3b82f6",
            flex: "1 1 200px"
          }}>
            <div style={{ fontSize: "1.5rem" }}>👥</div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Players</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1E3A8A" }}>{allUsers.length}</div>
            </div>
          </div>

          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            border: "2px solid #22c55e",
            flex: "1 1 200px"
          }}>
            <div style={{ fontSize: "1.5rem" }}>✅</div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Submitted</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#047857" }}>{rankings.length}</div>
            </div>
          </div>

          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            border: "2px solid #ef4444",
            flex: "1 1 200px"
          }}>
            <div style={{ fontSize: "1.5rem" }}>⏳</div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Pending</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#991b1b" }}>{allUsers.length - rankings.length}</div>
            </div>
          </div>
        </div>

        {allUsers.length - rankings.length > 0 && (
          <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.05)", borderRadius: "8px", marginBottom: "2rem" }}>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 600, color: "#991b1b" }}>
              Players who haven't submitted:
            </p>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
              {allUsers.filter(u => !rankings.some(r => r.user.email === u.email)).map(u => u.name).join(", ")}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {status !== "COMPLETED" && (
            <>
              <button onClick={previewDraft} disabled={loading} style={{ background: "#3b82f6" }}>
                {loading ? "Processing..." : "👁️ Preview Draft"}
              </button>
              {showPreview && (
                <button
                  onClick={() => {
                    console.log("[PicksManager] Top Approve button clicked, loading:", loading);
                    approveDraft();
                  }}
                  disabled={loading}
                  style={{ background: "#22c55e", opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? "Approving..." : "✅ Approve & Run Draft"}
                </button>
              )}
            </>
          )}
          {status === "COMPLETED" && (
            <button
              onClick={handleUnlockDraft}
              disabled={unlocking}
              style={{ background: "var(--brand-red)", fontSize: "1rem", padding: "0.75rem 1.5rem" }}
            >
              {unlocking ? "Unlocking..." : "🔓 Unlock Draft"}
            </button>
          )}
          <button onClick={exportToCSV} style={{ background: "#6b7280" }}>
            📥 Export CSV
          </button>
          <button onClick={loadStatus} disabled={loading} style={{ background: "#6b7280" }}>
            🔄 Refresh
          </button>
        </div>
        <p style={{ fontSize: "0.9rem", color: "#666", margin: "0 0 1rem 0" }}>
          {status === "PENDING" && "Click Preview to see draft results, then Approve to finalize."}
          {status === "COMPLETED" && "Draft is locked. Click Unlock to allow changes and re-run draft."}
          {status === "IN_PROGRESS" && "Draft is in progress..."}
        </p>

        {message && (
          <p style={{ marginTop: "1rem", padding: "1rem", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", fontWeight: 600 }}>
            {message}
          </p>
        )}
      </section>

      {/* All Rankings Table */}
      {rankings.length > 0 && (
        <section className="rg-section">
          <h2>All Player Rankings ({rankings.length})</h2>
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
        </section>
      )}

      {/* Draft Preview */}
      {showPreview && previewPicks.length > 0 && (
        <section className="rg-section">
          <div style={{ background: "#FEF3C7", padding: "1.5rem", borderRadius: "8px", marginBottom: "1rem", border: "2px solid #F59E0B" }}>
            <h3 style={{ marginTop: 0, color: "#92400E" }}>Draft Preview</h3>
            <p style={{ margin: "0 0 1rem 0", color: "#92400E" }}>
              Review the draft results below. Click "Approve Draft" to finalize, or "Cancel" to go back.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  console.log("[PicksManager] Approve Draft button clicked, loading:", loading);
                  approveDraft();
                }}
                disabled={loading}
                style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? "Approving..." : "Approve Draft"}
              </button>
              <button onClick={() => setShowPreview(false)} style={{ background: "#6b7280" }}>
                Cancel
              </button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Pick #</th>
                <th>User</th>
                <th>Castaway</th>
                <th>Round</th>
              </tr>
            </thead>
            <tbody>
              {previewPicks.map((pick) => (
                <tr key={pick.id}>
                  <td>{pick.pickNumber}</td>
                  <td>{pick.user?.name ?? pick.user?.email}</td>
                  <td>{pick.castaway?.name}</td>
                  <td>{pick.round}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Final Draft Results */}
      {status === "COMPLETED" && picks.length > 0 && (
        <section className="rg-section">
          <h2>Final Draft Results</h2>
          <table>
            <thead>
              <tr>
                <th>Pick #</th>
                <th>User</th>
                <th>Castaway</th>
                <th>Round</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((pick) => (
                <tr key={pick.id}>
                  <td>{pick.pickNumber}</td>
                  <td>{pick.user?.name ?? pick.user?.email}</td>
                  <td>{pick.castaway?.name}</td>
                  <td>{pick.round}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Debug Section */}
      <section className="rg-section" style={{ marginTop: "3rem", background: "#FEF3C7", border: "2px solid #F59E0B" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ color: "#92400E" }}>🔍 Debug Picks Issue</h2>
          <button
            onClick={() => {
              if (!showDebug) loadDebugInfo();
              setShowDebug(!showDebug);
            }}
            style={{ background: "#F59E0B", color: "white" }}
          >
            {showDebug ? "Hide Debug" : "Show Debug Info"}
          </button>
        </div>

        {showDebug && debugInfo && (
          <div style={{ background: "white", padding: "1rem", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.9rem" }}>
            <h3 style={{ marginTop: 0 }}>System Status:</h3>
            <p><strong>Active Week:</strong> {debugInfo.activeWeek ? `Week ${debugInfo.activeWeek.weekNumber}` : "❌ NO ACTIVE WEEK CONFIGURED"}</p>
            <p><strong>Total Weeks in DB:</strong> {debugInfo.totalWeeks}</p>
            <p><strong>Total Weekly Picks Saved:</strong> {debugInfo.totalPicks}</p>
            <p><strong>Total Draft Picks:</strong> {debugInfo.totalDraftPicks}</p>
            <p><strong>Total Users:</strong> {debugInfo.totalUsers}</p>

            {debugInfo.activeWeek && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#F0FDF4", border: "1px solid #22c55e", borderRadius: "4px" }}>
                <h4 style={{ marginTop: 0, color: "#047857" }}>Active Week Details:</h4>
                <p><strong>Week Number:</strong> {debugInfo.activeWeek.weekNumber}</p>
                <p><strong>Opens At:</strong> {debugInfo.activeWeek.picksOpenAt ? new Date(debugInfo.activeWeek.picksOpenAt).toLocaleString() : "Not set"}</p>
                <p><strong>Closes At:</strong> {debugInfo.activeWeek.picksCloseAt ? new Date(debugInfo.activeWeek.picksCloseAt).toLocaleString() : "Not set"}</p>
              </div>
            )}

            {!debugInfo.activeWeek && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#FEE2E2", border: "1px solid #ef4444", borderRadius: "4px" }}>
                <p style={{ margin: 0, color: "#991b1b", fontWeight: 600 }}>⚠️ NO ACTIVE WEEK - This is why picks aren't saving!</p>
                <p style={{ margin: "0.5rem 0 0 0", color: "#991b1b" }}>Go to Week Manager and mark a week as active.</p>
              </div>
            )}

            <h4 style={{ marginTop: "1.5rem" }}>All Weeks:</h4>
            <table style={{ width: "100%", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Week #</th>
                  <th>Active</th>
                  <th>Opens</th>
                  <th>Closes</th>
                </tr>
              </thead>
              <tbody>
                {debugInfo.weeks.map((w: any) => (
                  <tr key={w.weekNumber}>
                    <td>Week {w.weekNumber}</td>
                    <td>{w.isActive ? "✅ Yes" : "No"}</td>
                    <td>{w.picksOpenAt ? new Date(w.picksOpenAt).toLocaleString() : "—"}</td>
                    <td>{w.picksCloseAt ? new Date(w.picksCloseAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {debugInfo.recentPicks.length > 0 && (
              <>
                <h4 style={{ marginTop: "1.5rem" }}>Recent 5 Picks:</h4>
                <table style={{ width: "100%", fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Castaway</th>
                      <th>Week</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugInfo.recentPicks.map((p: any) => (
                      <tr key={p.id}>
                        <td>{p.user.name}</td>
                        <td>{p.castaway.name}</td>
                        <td>Week {p.weekNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </section>

      {/* Weekly Picks Log */}
      <section className="rg-section" style={{ marginTop: "3rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>Weekly Picks Log</h2>
          <button
            onClick={() => {
              if (!showWeeklyLog) loadWeeklyPicks();
              setShowWeeklyLog(!showWeeklyLog);
            }}
            style={{ background: "#3b82f6" }}
          >
            {showWeeklyLog ? "Hide Log" : "Show Weekly Picks Log"}
          </button>
        </div>

        {showWeeklyLog && (
          <>
            {weeklyPicks.length === 0 ? (
              <p style={{ color: "#666", fontStyle: "italic" }}>No weekly picks submitted yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Player</th>
                    <th>Castaway</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyPicks.map((pick) => (
                    <tr key={pick.id}>
                      <td>Week {pick.weekNumber}</td>
                      <td>{pick.user.name}</td>
                      <td>{pick.castaway.name}</td>
                      <td>{new Date(pick.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default PicksManager;
