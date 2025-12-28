import React, { useEffect, useState } from "react";
import api from "@/lib/api";

interface LeagueWithUsers {
  id: string;
  name: string;
  code: string;
  draftStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  draftRunAt: string | null;
  picksPerUser: number;
  rankingLockAt: string | null;
  users: Array<{ id: string; name: string; email: string; isAdmin: boolean }>;
}

interface DraftStatus {
  draftStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  draftRunAt: string | null;
  picks: Array<{
    id: string;
    round: number;
    pickNumber: number;
    user: { id: string; name: string; email: string };
    castaway: { id: string; name: string };
  }>;
}

const LeagueManager = () => {
  const [league, setLeague] = useState<LeagueWithUsers | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningDraft, setRunningDraft] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [picksPerUser, setPicksPerUser] = useState(2);

  const loadLeague = async () => {
    try {
      const res = await api.get("/api/league");
      setLeague(res.data);
      setPicksPerUser(res.data?.picksPerUser ?? 2); // Default to 2 if null
      setError(null);
    } catch (err) {
      console.error("Failed to load league:", err);
      setError("Unable to load league settings.");
    }
  };

  const loadDraftStatus = async () => {
    try {
      const res = await api.get("/api/draft/status");
      setDraftStatus(res.data);
    } catch (err) {
      console.error("Failed to load draft status:", err);
    }
  };

  useEffect(() => {
    loadLeague();
    loadDraftStatus();
  }, []);

  const runDraft = async () => {
    if (!window.confirm("Run the draft now? This will assign castaways based on user rankings.")) {
      return;
    }

    setRunningDraft(true);
    try {
      await api.post("/api/draft/run");
      await loadLeague();
      await loadDraftStatus();
      alert("Draft completed successfully!");
    } catch (err: any) {
      console.error("Failed to run draft:", err);
      alert(err.response?.data?.error || "Failed to run draft");
    } finally {
      setRunningDraft(false);
    }
  };

  const resetDraft = async () => {
    if (!window.confirm("Reset the draft? This will delete all draft picks and reset the draft status.")) {
      return;
    }

    try {
      await api.post("/api/draft/reset");
      await loadLeague();
      await loadDraftStatus();
      alert("Draft reset successfully!");
    } catch (err: any) {
      console.error("Failed to reset draft:", err);
      alert(err.response?.data?.error || "Failed to reset draft");
    }
  };

  const saveSettings = async () => {
    try {
      await api.put("/api/league", { picksPerUser });
      await loadLeague();
      setEditingSettings(false);
      alert("Settings saved!");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      alert(err.response?.data?.error || "Failed to save settings");
    }
  };

  if (error) {
    return <div className="rg-page" style={{ color: "crimson" }}>{error}</div>;
  }

  if (!league) return <div className="rg-page">Loading...</div>;

  const draftStatusColor =
    league.draftStatus === "COMPLETED" ? "green" :
    league.draftStatus === "IN_PROGRESS" ? "orange" : "gray";

  return (
    <main role="main" aria-label="League Manager" className="rg-page">
      <section className="rg-hero" aria-labelledby="league-mgmt-title">
        <span className="rg-pill">Draft Manager</span>
        <h1 id="league-mgmt-title">Draft Controls & Status</h1>
        <p>Manage the draft process, view results, and configure league settings</p>
      </section>

      {/* Draft Controls - Top Section with Buttons */}
      <section className="rg-section" style={{ marginTop: "2rem" }}>
        <h2>Draft Controls</h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
          {league.draftStatus !== "IN_PROGRESS" && (
            <button
              onClick={runDraft}
              disabled={runningDraft}
              style={{ backgroundColor: "var(--primary)", flex: "1 1 200px" }}
            >
              {runningDraft ? "Running Draft..." : league.draftStatus === "COMPLETED" ? "Re-run Draft" : "Run Draft Now"}
            </button>
          )}
          {league.draftStatus === "COMPLETED" && (
            <button
              onClick={resetDraft}
              style={{ backgroundColor: "orange", flex: "1 1 200px" }}
            >
              Reset Draft
            </button>
          )}
          <button
            onClick={() => setEditingSettings(!editingSettings)}
            style={{ backgroundColor: "#6b7280", flex: "1 1 200px" }}
          >
            {editingSettings ? "Cancel Settings" : "Edit Settings"}
          </button>
        </div>
      </section>

      {/* Draft Status & Configuration - No Horizontal Scroll */}
      <section className="rg-section" style={{ marginTop: "2rem" }}>
        <h2>Draft Status & Configuration</h2>
        <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
          <div className="rg-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <strong>Draft Status:</strong>
                <span style={{
                  marginLeft: "0.75rem",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "4px",
                  backgroundColor: draftStatusColor,
                  color: "white",
                  fontSize: "0.875rem"
                }}>
                  {league.draftStatus}
                </span>
              </div>

              <div>
                <strong>Picks Per User:</strong>
                {editingSettings ? (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={picksPerUser}
                      onChange={(e) => setPicksPerUser(Number(e.target.value))}
                      style={{ width: "80px" }}
                    />
                    <button onClick={saveSettings} style={{ fontSize: "0.875rem", padding: "0.35rem 0.75rem" }}>
                      Save
                    </button>
                  </div>
                ) : (
                  <span style={{ marginLeft: "0.75rem" }}>{league.picksPerUser}</span>
                )}
              </div>

              {league.draftRunAt && (
                <div>
                  <strong>Last Draft Run:</strong> {new Date(league.draftRunAt).toLocaleString()}
                </div>
              )}
              {league.rankingLockAt && (
                <div>
                  <strong>Rankings Locked At:</strong> {new Date(league.rankingLockAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Draft Results */}
      {draftStatus && draftStatus.picks.length > 0 && (
        <section className="rg-section" style={{ marginTop: "2rem" }}>
          <h2>Draft Results ({draftStatus.picks.length} picks)</h2>
          <div style={{ marginTop: "1rem", maxHeight: "500px", overflowY: "auto", overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Pick #</th>
                  <th>Round</th>
                  <th>Player</th>
                  <th>Castaway</th>
                </tr>
              </thead>
              <tbody>
                {draftStatus.picks.map((pick) => (
                  <tr key={pick.id}>
                    <td>{pick.pickNumber}</td>
                    <td>{pick.round}</td>
                    <td>{pick.user.name}</td>
                    <td>{pick.castaway.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* League Settings at Bottom */}
      <section className="rg-section" style={{ marginTop: "3rem" }}>
        <h2>League Settings</h2>
        <div className="rg-card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <strong>League Name:</strong> <span style={{ marginLeft: "0.75rem" }}>{league.name}</span>
            </div>
            <div>
              <strong>League Code:</strong> <span style={{ marginLeft: "0.75rem" }}>{league.code}</span>
            </div>
            <div>
              <strong>Total Members:</strong> <span style={{ marginLeft: "0.75rem" }}>{league.users.length}</span>
            </div>
          </div>
        </div>

        {/* League Members */}
        <div style={{ marginTop: "2rem" }}>
          <h3>League Members</h3>
          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {league.users.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>
                      <span style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        backgroundColor: member.isAdmin ? "var(--primary)" : "var(--text-muted)",
                        color: "white",
                        fontSize: "0.875rem"
                      }}>
                        {member.isAdmin ? "Admin" : "Player"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LeagueManager;
