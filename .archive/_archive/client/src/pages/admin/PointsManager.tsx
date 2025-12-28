import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Castaway } from "@/shared/types";

type Entry = { castawayId: string; points: number };

interface Week {
  id: string;
  weekNumber: number;
  isActive: boolean;
  lockAt: string | null;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const PointsManager = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [castaways, setCastaways] = useState<Castaway[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [newWeekNumber, setNewWeekNumber] = useState("");
  const [creatingWeek, setCreatingWeek] = useState(false);

  const loadWeeks = async () => {
    try {
      const res = await api.get("/api/admin/weeks");
      setWeeks(res.data);

      // Auto-select active week or first week
      const activeWeek = res.data.find((w: Week) => w.isActive);
      if (activeWeek && !selectedWeek) {
        setSelectedWeek(activeWeek.id);
      } else if (res.data.length > 0 && !selectedWeek) {
        setSelectedWeek(res.data[0].id);
      }
    } catch (error) {
      console.error("Failed to load weeks", error);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const [castawaysRes, weeksRes, usersRes] = await Promise.all([
          api.get("/api/castaways"),
          api.get("/api/admin/weeks"),
          api.get("/api/users")
        ]);

        setCastaways(castawaysRes.data);
        setWeeks(weeksRes.data);
        setUsers(usersRes.data);

        // Auto-select active week or first week
        const activeWeek = weeksRes.data.find((w: Week) => w.isActive);
        if (activeWeek) {
          setSelectedWeek(activeWeek.id);
        } else if (weeksRes.data.length > 0) {
          setSelectedWeek(weeksRes.data[0].id);
        }
      } catch (error) {
        console.error("Failed to load scoring data", error);
        setMessage("Unable to load data");
      }
    }

    load();
  }, []);

  // Load existing scores when week is selected
  // Only trigger when selectedWeek changes, not on mount or data refresh
  useEffect(() => {
    async function loadScoresForWeek() {
      if (!selectedWeek || castaways.length === 0) return;

      const week = weeks.find(w => w.id === selectedWeek);
      if (!week) return;

      try {
        const res = await api.get(`/api/admin/scoring/week/${week.weekNumber}`);
        const existingScores = res.data.scores || [];

        // Map existing scores to entries, defaulting to 0 for castaways without scores
        const scoreMap = new Map<string, number>(existingScores.map((s: any) => [s.castawayId, s.points]));
        setEntries(castaways.map((c: Castaway) => ({
          castawayId: c.id,
          points: scoreMap.get(c.id) ?? 0
        })));
      } catch (error) {
        console.error("Failed to load existing scores", error);
        // Initialize with zeros if no scores exist yet
        setEntries(castaways.map((c: Castaway) => ({ castawayId: c.id, points: 0 })));
      }
    }

    loadScoresForWeek();
  }, [selectedWeek]);

  const updateEntry = (castawayId: string, value: number) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.castawayId === castawayId ? { ...entry, points: value } : entry))
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWeek) {
      setMessage("Please select a week");
      setStatus("error");
      return;
    }

    setStatus("saving");
    setMessage(null);
    try {
      const week = weeks.find((w) => w.id === selectedWeek);
      if (!week) {
        throw new Error("Week not found");
      }

      await api.post(`/api/admin/scoring/week/${week.weekNumber}`, {
        entries: entries // Send all entries including zeros to allow resetting scores
      });
      setStatus("success");
      setMessage("Scores saved and leaderboard updated.");
    } catch (error: any) {
      console.error("Failed to save scores:", error);
      setStatus("error");
      setMessage(error?.response?.data?.error ?? "Unable to save scores");
    }
  };

  const createWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingWeek(true);
    setMessage(null);
    try {
      await api.post("/api/admin/week", {
        weekNumber: Number(newWeekNumber),
        isActive: false // Don't activate by default
      });
      setNewWeekNumber("");
      setMessage("Week created successfully!");
      await loadWeeks();
    } catch (error: any) {
      console.error("Failed to create week:", error);
      setMessage(error?.response?.data?.error ?? "Failed to create week");
    } finally {
      setCreatingWeek(false);
    }
  };

  const setActiveWeek = async (weekId: string) => {
    try {
      const week = weeks.find(w => w.id === weekId);
      if (!week) return;

      await api.post("/api/admin/week", {
        weekNumber: week.weekNumber,
        isActive: true
      });

      await loadWeeks();
      setMessage(`Week ${week.weekNumber} is now active!`);
    } catch (error: any) {
      console.error("Failed to activate week:", error);
      setMessage(error?.response?.data?.error ?? "Failed to activate week");
    }
  };

  return (
    <main role="main" aria-label="Points Manager" className="rg-page">
      <section className="rg-hero" aria-labelledby="points-mgr-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="rg-pill">Weekly Scoring & Season Controls</span>
            <h1 id="points-mgr-title">Enter episode results and manage weeks</h1>
            <p>Select a week, enter scores, and activate weeks as the season progresses</p>
          </div>
          <button onClick={loadWeeks} style={{ background: "#6b7280", marginTop: "1rem" }}>
            🔄 Refresh
          </button>
        </div>
      </section>

      {/* Week Management */}
      <section className="rg-section">
        <h2>Week Management</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
          {/* Create New Week */}
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", border: "2px solid var(--border-light)" }}>
            <h3 style={{ marginTop: 0 }}>Create New Week</h3>
            <form onSubmit={createWeek} style={{ display: "grid", gap: "0.75rem" }}>
              <label htmlFor="new-week">Week Number</label>
              <input
                id="new-week"
                type="number"
                placeholder="Week number"
                value={newWeekNumber}
                onChange={(e) => setNewWeekNumber(e.target.value)}
                required
                min={1}
                max={20}
              />
              <button type="submit" disabled={creatingWeek}>
                {creatingWeek ? "Creating..." : "Create Week"}
              </button>
            </form>
          </div>

          {/* Week Selector Dropdown */}
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", border: "2px solid var(--border-light)" }}>
            <h3 style={{ marginTop: 0 }}>Active Week Control</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Select a week from the dropdown and click "Set as Active" to activate it. Only one week can be active at a time.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="week-selector" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
                  Select Week
                </label>
                <select
                  id="week-selector"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">Choose a week...</option>
                  {weeks.map((week) => (
                    <option key={week.id} value={week.id}>
                      Week {week.weekNumber} {week.isActive && "✓ (Active)"}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => selectedWeek && setActiveWeek(selectedWeek)}
                disabled={!selectedWeek || weeks.find(w => w.id === selectedWeek)?.isActive}
                style={{ background: "#10b981" }}
              >
                {weeks.find(w => w.id === selectedWeek)?.isActive ? "Already Active" : "Set as Active"}
              </button>
            </div>

            {/* All Weeks List */}
            <div style={{ marginTop: "1.5rem" }}>
              <h4 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>All Weeks:</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {weeks.map((week) => (
                  <div
                    key={week.id}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      background: week.isActive ? "#10b981" : "#e5e7eb",
                      color: week.isActive ? "white" : "#374151",
                      fontSize: "0.9rem",
                      fontWeight: week.isActive ? 600 : 400
                    }}
                  >
                    Week {week.weekNumber} {week.isActive && "✓"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring Form */}
      <section className="rg-section" style={{ marginTop: "3rem" }}>
        <h2>Enter Scores for Selected Week</h2>
        <form onSubmit={submit} style={{ display: "grid", gap: "1.25rem" }}>
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", border: "2px solid var(--border-light)" }}>
            <h3 style={{ marginTop: 0 }}>Castaway Points</h3>
            <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid var(--border-light)", borderRadius: "8px", padding: "1rem" }}>
              {castaways.map((castaway) => (
                <div
                  key={castaway.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "0.75rem",
                    opacity: castaway.eliminated ? 0.5 : 1,
                    background: castaway.eliminated ? "#f3f4f6" : "transparent",
                    padding: "0.5rem",
                    borderRadius: "6px"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ display: "block" }}>{castaway.name}</span>
                    {castaway.eliminated && (
                      <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 600 }}>
                        ⚠️ Eliminated - no points allowed
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={entries.find((e) => e.castawayId === castaway.id)?.points ?? 0}
                    onChange={(e) => updateEntry(castaway.id, Number(e.target.value))}
                    disabled={castaway.eliminated}
                    style={{
                      width: 96,
                      opacity: castaway.eliminated ? 0.5 : 1,
                      cursor: castaway.eliminated ? "not-allowed" : "auto",
                      background: castaway.eliminated ? "#e5e7eb" : "white"
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={status === "saving" || !selectedWeek}>
            {status === "saving" ? "Saving..." : "Save Scores"}
          </button>

          {message && (
            <p style={{
              padding: "1rem",
              background: status === "success" || message.includes("active") ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              borderRadius: "8px",
              color: status === "success" || message.includes("active") ? "#22c55e" : "#ef4444",
              fontWeight: 600
            }}>
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  );
};

export default PointsManager;
