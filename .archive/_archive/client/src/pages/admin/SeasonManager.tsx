import React, { useState, useEffect } from "react";
import api from "@/lib/api";

interface Season {
  id: string;
  number: number;
  name: string;
  status: "COLLECTING" | "DRAFT_WEEK" | "ACTIVE" | "GRACE" | "ARCHIVED";
  isActive: boolean;
  rankingsOpen: boolean;
  draftExecuted: boolean;
  seasonLocked: boolean;
  episode1Date: string | null;
  draftDeadline: string | null;
  finaleDate: string | null;
}

interface Week {
  id: string;
  weekNumber: number;
  seasonId: string | null;
  isActive: boolean;
  picksOpenAt: string | null;
  picksCloseAt: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string; next: string | null }> = {
  COLLECTING: { bg: "#DBEAFE", text: "#1E40AF", label: "Collecting Signups", next: "DRAFT_WEEK" },
  DRAFT_WEEK: { bg: "#FEF3C7", text: "#92400E", label: "Draft Week", next: "ACTIVE" },
  ACTIVE: { bg: "#D1FAE5", text: "#065F46", label: "Active Season", next: "GRACE" },
  GRACE: { bg: "#E0E7FF", text: "#4338CA", label: "Grace Period", next: "ARCHIVED" },
  ARCHIVED: { bg: "#F3F4F6", text: "#4B5563", label: "Archived", next: null }
};

const SeasonManager = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New season form
  const [newSeasonNumber, setNewSeasonNumber] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [showNewSeasonForm, setShowNewSeasonForm] = useState(false);

  // New week form
  const [newWeekNumber, setNewWeekNumber] = useState("");
  const [showNewWeekForm, setShowNewWeekForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [seasonsRes, weeksRes] = await Promise.all([
        api.get("/api/seasons"),
        api.get("/api/admin/weeks")
      ]);
      setSeasons(seasonsRes.data || []);
      setWeeks(weeksRes.data || []);

      // Select active season by default
      const activeSeason = (seasonsRes.data || []).find((s: Season) => s.isActive);
      if (activeSeason) {
        setSelectedSeasonId(activeSeason.id);
      } else if (seasonsRes.data?.length > 0) {
        setSelectedSeasonId(seasonsRes.data[0].id);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
  const seasonWeeks = weeks.filter(w => w.seasonId === selectedSeasonId);

  const createSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/seasons", {
        number: parseInt(newSeasonNumber),
        name: newSeasonName,
        status: "COLLECTING"
      });
      setNewSeasonNumber("");
      setNewSeasonName("");
      setShowNewSeasonForm(false);
      await loadData();
    } catch (error) {
      console.error("Failed to create season:", error);
    } finally {
      setSaving(false);
    }
  };

  const transitionSeason = async (seasonNumber: number, newStatus: string) => {
    setSaving(true);
    try {
      await api.post(`/api/seasons/${seasonNumber}/transition`, { status: newStatus });
      await loadData();
    } catch (error) {
      console.error("Failed to transition season:", error);
    } finally {
      setSaving(false);
    }
  };

  const setActiveSeason = async (seasonNumber: number) => {
    setSaving(true);
    try {
      await api.post(`/api/seasons/${seasonNumber}/set-active`);
      await loadData();
    } catch (error) {
      console.error("Failed to set active season:", error);
    } finally {
      setSaving(false);
    }
  };

  const createWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonId) return;
    setSaving(true);
    try {
      await api.post("/api/admin/week", {
        weekNumber: parseInt(newWeekNumber),
        seasonId: selectedSeasonId,
        isActive: false
      });
      setNewWeekNumber("");
      setShowNewWeekForm(false);
      await loadData();
    } catch (error) {
      console.error("Failed to create week:", error);
    } finally {
      setSaving(false);
    }
  };

  const activateWeek = async (weekNumber: number) => {
    setSaving(true);
    try {
      await api.post("/api/admin/week", {
        weekNumber,
        isActive: true
      });
      await loadData();
    } catch (error) {
      console.error("Failed to activate week:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rg-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <p>Loading seasons...</p>
      </div>
    );
  }

  return (
    <main role="main" aria-label="Season Manager" className="rg-page">
      {/* Header */}
      <section className="rg-hero" aria-labelledby="season-mgr-title" style={{ paddingBottom: "1.5rem" }}>
        <span className="rg-pill">Season Controls</span>
        <h1 id="season-mgr-title">Manage Seasons & Weeks</h1>
        <p>Control season lifecycles, manage weeks, and configure game schedules.</p>
      </section>

      {/* Season Selector & Overview */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem", marginBottom: "2rem" }}>
        {/* Seasons List */}
        <div style={{ background: "#fff", border: "2px solid #E5E7EB", borderRadius: "12px", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Seasons</h3>
            <button
              onClick={() => setShowNewSeasonForm(!showNewSeasonForm)}
              style={{
                background: "#3B82F6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                cursor: "pointer",
                fontSize: "0.875rem"
              }}
            >
              + New Season
            </button>
          </div>

          {showNewSeasonForm && (
            <form onSubmit={createSeason} style={{ marginBottom: "1rem", padding: "1rem", background: "#F9FAFB", borderRadius: "8px" }}>
              <input
                type="number"
                placeholder="Season Number"
                value={newSeasonNumber}
                onChange={(e) => setNewSeasonNumber(e.target.value)}
                required
                style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
              />
              <input
                type="text"
                placeholder="Season Name"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                required
                style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
              />
              <button type="submit" disabled={saving} style={{ width: "100%", padding: "0.5rem", background: "#10B981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                {saving ? "Creating..." : "Create Season"}
              </button>
            </form>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {seasons.map((season) => (
              <div
                key={season.id}
                onClick={() => setSelectedSeasonId(season.id)}
                style={{
                  padding: "1rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: season.id === selectedSeasonId ? "#EFF6FF" : "#F9FAFB",
                  border: season.id === selectedSeasonId ? "2px solid #3B82F6" : "2px solid transparent",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Season {season.number}</strong>
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    background: statusConfig[season.status]?.bg,
                    color: statusConfig[season.status]?.text
                  }}>
                    {statusConfig[season.status]?.label || season.status}
                  </span>
                </div>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6B7280" }}>{season.name}</p>
                {season.isActive && (
                  <span style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 600 }}>★ Active Season</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Season Details */}
        {selectedSeason && (
          <div style={{ background: "#fff", border: "2px solid #E5E7EB", borderRadius: "12px", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ margin: 0 }}>Season {selectedSeason.number}</h2>
                <p style={{ color: "#6B7280", margin: "0.25rem 0 0" }}>{selectedSeason.name}</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {!selectedSeason.isActive && (
                  <button
                    onClick={() => setActiveSeason(selectedSeason.number)}
                    disabled={saving}
                    style={{
                      background: "#059669",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.5rem 1rem",
                      cursor: "pointer",
                      fontSize: "0.875rem"
                    }}
                  >
                    Set as Active
                  </button>
                )}
                {statusConfig[selectedSeason.status]?.next && (
                  <button
                    onClick={() => transitionSeason(selectedSeason.number, statusConfig[selectedSeason.status].next!)}
                    disabled={saving}
                    style={{
                      background: statusConfig[selectedSeason.status]?.text || "#3B82F6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.5rem 1rem",
                      cursor: "pointer",
                      fontSize: "0.875rem"
                    }}
                  >
                    Transition to {statusConfig[statusConfig[selectedSeason.status].next!]?.label}
                  </button>
                )}
              </div>
            </div>

            {/* Season Status */}
            <div style={{
              background: statusConfig[selectedSeason.status]?.bg || "#F3F4F6",
              color: statusConfig[selectedSeason.status]?.text || "#374151",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1.5rem"
            }}>
              <strong>Status: {statusConfig[selectedSeason.status]?.label || selectedSeason.status}</strong>
              <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem", fontSize: "0.875rem" }}>
                <span>Rankings: {selectedSeason.rankingsOpen ? "Open" : "Closed"}</span>
                <span>Draft: {selectedSeason.draftExecuted ? "Completed" : "Pending"}</span>
                <span>Locked: {selectedSeason.seasonLocked ? "Yes" : "No"}</span>
              </div>
            </div>

            {/* Season Dates */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "#F9FAFB", padding: "1rem", borderRadius: "8px" }}>
                <label style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Episode 1</label>
                <p style={{ margin: "0.25rem 0 0", fontWeight: 600 }}>
                  {selectedSeason.episode1Date ? new Date(selectedSeason.episode1Date).toLocaleDateString() : "Not set"}
                </p>
              </div>
              <div style={{ background: "#F9FAFB", padding: "1rem", borderRadius: "8px" }}>
                <label style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Draft Deadline</label>
                <p style={{ margin: "0.25rem 0 0", fontWeight: 600 }}>
                  {selectedSeason.draftDeadline ? new Date(selectedSeason.draftDeadline).toLocaleDateString() : "Not set"}
                </p>
              </div>
              <div style={{ background: "#F9FAFB", padding: "1rem", borderRadius: "8px" }}>
                <label style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Finale</label>
                <p style={{ margin: "0.25rem 0 0", fontWeight: 600 }}>
                  {selectedSeason.finaleDate ? new Date(selectedSeason.finaleDate).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Weeks Management */}
      {selectedSeason && (
        <section style={{ background: "#fff", border: "2px solid #E5E7EB", borderRadius: "12px", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Season {selectedSeason.number} Weeks</h3>
            <button
              onClick={() => setShowNewWeekForm(!showNewWeekForm)}
              style={{
                background: "#3B82F6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                cursor: "pointer",
                fontSize: "0.875rem"
              }}
            >
              + Add Week
            </button>
          </div>

          {showNewWeekForm && (
            <form onSubmit={createWeek} style={{ marginBottom: "1rem", padding: "1rem", background: "#F9FAFB", borderRadius: "8px", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem", color: "#6B7280" }}>Week Number</label>
                <input
                  type="number"
                  placeholder="Week #"
                  value={newWeekNumber}
                  onChange={(e) => setNewWeekNumber(e.target.value)}
                  required
                  min={1}
                  max={20}
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #D1D5DB", width: "100px" }}
                />
              </div>
              <button type="submit" disabled={saving} style={{ padding: "0.5rem 1rem", background: "#10B981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                {saving ? "Creating..." : "Create Week"}
              </button>
            </form>
          )}

          {seasonWeeks.length === 0 ? (
            <p style={{ color: "#6B7280", textAlign: "center", padding: "2rem" }}>No weeks created for this season yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              {seasonWeeks.sort((a, b) => a.weekNumber - b.weekNumber).map((week) => (
                <div
                  key={week.id}
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    background: week.isActive ? "#D1FAE5" : "#F9FAFB",
                    border: week.isActive ? "2px solid #10B981" : "2px solid #E5E7EB"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Week {week.weekNumber}</strong>
                    {week.isActive && (
                      <span style={{
                        background: "#10B981",
                        color: "#fff",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "9999px",
                        fontSize: "0.7rem",
                        fontWeight: 600
                      }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  {week.picksCloseAt && (
                    <p style={{ fontSize: "0.75rem", color: "#6B7280", margin: "0.5rem 0 0" }}>
                      Closes: {new Date(week.picksCloseAt).toLocaleString()}
                    </p>
                  )}
                  {!week.isActive && (
                    <button
                      onClick={() => activateWeek(week.weekNumber)}
                      disabled={saving}
                      style={{
                        marginTop: "0.75rem",
                        width: "100%",
                        padding: "0.35rem",
                        background: "#3B82F6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8rem"
                      }}
                    >
                      Activate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export default SeasonManager;
