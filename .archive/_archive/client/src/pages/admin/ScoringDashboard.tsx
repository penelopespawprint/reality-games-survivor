/**
 * Scoring Dashboard
 *
 * Episode-based scoring with 100+ rules organized by category.
 * Grid layout: Castaways as columns, Rules as rows, +/- buttons for incrementing.
 */

import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface Castaway {
  id: string;
  name: string;
  eliminated: boolean;
  tribe?: string;
}

interface ScoringRule {
  id: string;
  category: string;
  name: string;
  points: number;
  isActive: boolean;
}

interface ScoreEntry {
  id: string;
  sessionId: string;
  castawayId: string;
  ruleId: string;
  count: number;
  calculatedPoints: number;
  rule: ScoringRule;
}

interface ScoringSession {
  id: string;
  weekNumber: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  notes?: string;
  publishedAt?: string;
}

interface SessionData {
  session: ScoringSession;
  castaways: Castaway[];
  rules: ScoringRule[];
  entryMap: Record<string, Record<string, ScoreEntry>>;
  castawayTotals: Record<string, number>;
  categories: string[];
}

const ScoringDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Week selection
  const [weeks, setWeeks] = useState<{ id: string; weekNumber: number; isActive: boolean }[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // Session data
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);

  // Category expansion state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Summary stats
  const [summary, setSummary] = useState<{
    rules: { total: number; active: number };
    sessions: { total: number; published: number; draft: number };
  } | null>(null);

  // Load weeks on mount
  useEffect(() => {
    loadWeeks();
    loadSummary();
  }, []);

  const loadWeeks = async () => {
    try {
      const res = await api.get("/api/admin/weeks");
      setWeeks(res.data || []);

      // Auto-select active week
      const activeWeek = res.data.find((w: any) => w.isActive);
      if (activeWeek && !selectedWeek) {
        setSelectedWeek(activeWeek.weekNumber);
      } else if (res.data.length > 0 && !selectedWeek) {
        setSelectedWeek(res.data[0].weekNumber);
      }
    } catch (err) {
      console.error("Failed to load weeks:", err);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await api.get("/api/admin/scoring-dashboard/summary");
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  };

  // Load session when week is selected
  useEffect(() => {
    if (selectedWeek) {
      loadSession(selectedWeek);
    }
  }, [selectedWeek]);

  const loadSession = async (weekNumber: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/admin/scoring-dashboard/sessions/week/${weekNumber}`);

      if (!res.data.session) {
        // No session exists yet - create one
        const createRes = await api.post("/api/admin/scoring-dashboard/sessions", { weekNumber });
        // Reload after creating
        const reloadRes = await api.get(`/api/admin/scoring-dashboard/sessions/week/${weekNumber}`);
        setSessionData(reloadRes.data);
      } else {
        setSessionData(res.data);
        // Expand first category by default
        if (res.data.categories && res.data.categories.length > 0) {
          setExpandedCategories(new Set([res.data.categories[0]]));
        }
      }
    } catch (err: any) {
      console.error("Failed to load session:", err);
      setError(err.response?.data?.error || "Failed to load scoring session");
    } finally {
      setLoading(false);
    }
  };

  // Get count for a cell
  const getCount = useCallback((castawayId: string, ruleId: string): number => {
    if (!sessionData?.entryMap) return 0;
    return sessionData.entryMap[castawayId]?.[ruleId]?.count || 0;
  }, [sessionData]);

  // Increment/decrement handler
  const handleIncrement = async (castawayId: string, ruleId: string, delta: number) => {
    if (!sessionData?.session) return;
    if (sessionData.session.status === "PUBLISHED") {
      setMessage({ text: "Cannot modify published session", type: "error" });
      return;
    }

    const cellKey = `${castawayId}-${ruleId}`;
    setUpdatingCell(cellKey);

    try {
      const res = await api.post("/api/admin/scoring-dashboard/entries/increment", {
        sessionId: sessionData.session.id,
        castawayId,
        ruleId,
        delta
      });

      // Update local state
      setSessionData(prev => {
        if (!prev) return prev;

        const newEntryMap = { ...prev.entryMap };
        if (!newEntryMap[castawayId]) {
          newEntryMap[castawayId] = {};
        }
        newEntryMap[castawayId][ruleId] = res.data;

        // Recalculate castaway totals
        const newTotals = { ...prev.castawayTotals };
        let total = 0;
        for (const rid of Object.keys(newEntryMap[castawayId])) {
          total += newEntryMap[castawayId][rid]?.calculatedPoints || 0;
        }
        newTotals[castawayId] = total;

        return { ...prev, entryMap: newEntryMap, castawayTotals: newTotals };
      });
    } catch (err: any) {
      console.error("Failed to update entry:", err);
      setMessage({ text: err.response?.data?.error || "Failed to update", type: "error" });
    } finally {
      setUpdatingCell(null);
    }
  };

  // Publish session
  const handlePublish = async () => {
    if (!sessionData?.session) return;

    if (!confirm("Publish this scoring session? This will update player scores and the leaderboard.")) {
      return;
    }

    try {
      const res = await api.post(`/api/admin/scoring-dashboard/sessions/${sessionData.session.id}/publish`);
      setMessage({ text: res.data.message, type: "success" });
      loadSession(selectedWeek!);
      loadSummary();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || "Failed to publish", type: "error" });
    }
  };

  // Unpublish session
  const handleUnpublish = async () => {
    if (!sessionData?.session) return;

    if (!confirm("Unpublish this session? It will become editable again.")) {
      return;
    }

    try {
      await api.post(`/api/admin/scoring-dashboard/sessions/${sessionData.session.id}/unpublish`);
      setMessage({ text: "Session reverted to draft", type: "success" });
      loadSession(selectedWeek!);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || "Failed to unpublish", type: "error" });
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Expand/collapse all
  const expandAll = () => {
    if (sessionData?.categories) {
      setExpandedCategories(new Set(sessionData.categories));
    }
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  if (loading && !sessionData) {
    return (
      <div className="rg-page">
        <section className="rg-hero">
          <span className="rg-pill">Loading...</span>
          <h1>Scoring Dashboard</h1>
        </section>
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2rem" }}>Loading scoring dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rg-page">
        <section className="rg-hero">
          <span className="rg-pill" style={{ background: "#ef4444" }}>Error</span>
          <h1>Scoring Dashboard</h1>
        </section>
        <div style={{ textAlign: "center", padding: "3rem", color: "#ef4444" }}>
          {error}
        </div>
      </div>
    );
  }

  const isPublished = sessionData?.session?.status === "PUBLISHED";

  return (
    <main role="main" aria-label="Scoring Dashboard" className="rg-page">
      {/* Header */}
      <section className="rg-hero" aria-labelledby="scoring-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="rg-pill">Episode Scoring</span>
            <h1 id="scoring-title">Scoring Dashboard</h1>
            <p>Score episodes with 100+ rules. Click +/- to increment castaway points.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => loadSession(selectedWeek!)} style={{ background: "#6b7280" }}>
              Refresh
            </button>
            {isPublished ? (
              <button onClick={handleUnpublish} style={{ background: "#f59e0b" }}>
                Unpublish
              </button>
            ) : (
              <button onClick={handlePublish} style={{ background: "#10b981" }}>
                Publish Scores
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "1rem",
            margin: "1rem",
            borderRadius: "8px",
            background: message.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: message.type === "success" ? "#22c55e" : "#ef4444",
            fontWeight: 600
          }}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{ marginLeft: "1rem", background: "transparent", padding: "0.25rem" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <section className="rg-section">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ background: "#f0f9ff", padding: "1rem", borderRadius: "8px", minWidth: "120px" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0369a1" }}>{summary.rules.active}</div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Active Rules</div>
            </div>
            <div style={{ background: "#f0fdf4", padding: "1rem", borderRadius: "8px", minWidth: "120px" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#15803d" }}>{summary.sessions.published}</div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Published</div>
            </div>
            <div style={{ background: "#fefce8", padding: "1rem", borderRadius: "8px", minWidth: "120px" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#a16207" }}>{summary.sessions.draft}</div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Drafts</div>
            </div>
          </div>
        </section>
      )}

      {/* Week Selector */}
      <section className="rg-section">
        <h2>Select Week</h2>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedWeek || ""}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            style={{ minWidth: "200px" }}
          >
            <option value="">Choose a week...</option>
            {weeks.map((week) => (
              <option key={week.id} value={week.weekNumber}>
                Week {week.weekNumber} {week.isActive && "(Active)"}
              </option>
            ))}
          </select>
          {sessionData?.session && (
            <span
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                background: isPublished ? "#dcfce7" : "#fef3c7",
                color: isPublished ? "#15803d" : "#a16207",
                fontWeight: 600
              }}
            >
              {isPublished ? "PUBLISHED" : "DRAFT"}
            </span>
          )}
        </div>
      </section>

      {/* Scoring Grid */}
      {sessionData && (
        <section className="rg-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Scoring Grid - Week {selectedWeek}</h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={expandAll} style={{ background: "#6b7280", padding: "0.5rem 1rem" }}>
                Expand All
              </button>
              <button onClick={collapseAll} style={{ background: "#6b7280", padding: "0.5rem 1rem" }}>
                Collapse All
              </button>
            </div>
          </div>

          {/* Castaway Totals Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `250px repeat(${sessionData.castaways.length}, 100px)`,
              gap: "2px",
              marginBottom: "1rem",
              background: "#1a1a1a",
              borderRadius: "8px 8px 0 0",
              padding: "1px"
            }}
          >
            <div style={{ background: "#1a1a1a", color: "white", padding: "0.75rem", fontWeight: "bold" }}>
              Castaway Totals
            </div>
            {sessionData.castaways.map((castaway) => (
              <div
                key={castaway.id}
                style={{
                  background: castaway.eliminated ? "#374151" : "#1f2937",
                  color: "white",
                  padding: "0.5rem",
                  textAlign: "center",
                  fontSize: "0.75rem"
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                  {castaway.name.split(" ")[0]}
                </div>
                <div style={{ fontSize: "1.25rem", color: "#10b981" }}>
                  {(sessionData.castawayTotals[castaway.id] || 0).toFixed(1)}
                </div>
                {castaway.eliminated && (
                  <div style={{ fontSize: "0.625rem", color: "#ef4444" }}>OUT</div>
                )}
              </div>
            ))}
          </div>

          {/* Categories and Rules */}
          <div style={{ overflow: "auto", maxHeight: "60vh" }}>
            {sessionData.categories.map((category) => {
              const categoryRules = sessionData.rules.filter((r) => r.category === category);
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} style={{ marginBottom: "0.5rem" }}>
                  {/* Category Header */}
                  <div
                    onClick={() => toggleCategory(category)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: `250px repeat(${sessionData.castaways.length}, 100px)`,
                      gap: "2px",
                      cursor: "pointer",
                      background: "#e5e7eb"
                    }}
                  >
                    <div
                      style={{
                        background: "#374151",
                        color: "white",
                        padding: "0.75rem",
                        fontWeight: "bold",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>{category}</span>
                      <span>{isExpanded ? "▼" : "▶"} ({categoryRules.length})</span>
                    </div>
                    {sessionData.castaways.map((castaway) => (
                      <div
                        key={castaway.id}
                        style={{
                          background: "#9ca3af",
                          padding: "0.75rem",
                          textAlign: "center"
                        }}
                      />
                    ))}
                  </div>

                  {/* Rules */}
                  {isExpanded &&
                    categoryRules.map((rule) => (
                      <div
                        key={rule.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: `250px repeat(${sessionData.castaways.length}, 100px)`,
                          gap: "2px",
                          background: "#f9fafb"
                        }}
                      >
                        {/* Rule Name */}
                        <div
                          style={{
                            background: "white",
                            padding: "0.5rem",
                            borderBottom: "1px solid #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.875rem"
                          }}
                        >
                          <span>{rule.name}</span>
                          <span
                            style={{
                              color: rule.points >= 0 ? "#15803d" : "#dc2626",
                              fontWeight: "bold",
                              fontSize: "0.75rem"
                            }}
                          >
                            {rule.points >= 0 ? "+" : ""}
                            {rule.points}
                          </span>
                        </div>

                        {/* Castaway Cells */}
                        {sessionData.castaways.map((castaway) => {
                          const count = getCount(castaway.id, rule.id);
                          const cellKey = `${castaway.id}-${rule.id}`;
                          const isUpdating = updatingCell === cellKey;

                          return (
                            <div
                              key={castaway.id}
                              style={{
                                background: castaway.eliminated
                                  ? "#f3f4f6"
                                  : count > 0
                                  ? "#dcfce7"
                                  : "white",
                                padding: "0.25rem",
                                borderBottom: "1px solid #e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.25rem",
                                opacity: isUpdating ? 0.5 : 1
                              }}
                            >
                              <button
                                onClick={() => handleIncrement(castaway.id, rule.id, -1)}
                                disabled={count === 0 || isPublished || castaway.eliminated}
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  padding: 0,
                                  fontSize: "1rem",
                                  background: count > 0 ? "#dc2626" : "#9ca3af",
                                  color: "white",
                                  borderRadius: "4px",
                                  cursor: count === 0 || isPublished ? "not-allowed" : "pointer"
                                }}
                              >
                                -
                              </button>
                              <span
                                style={{
                                  minWidth: "24px",
                                  textAlign: "center",
                                  fontWeight: count > 0 ? "bold" : "normal",
                                  color: count > 0 ? "#15803d" : "#6b7280"
                                }}
                              >
                                {count}
                              </span>
                              <button
                                onClick={() => handleIncrement(castaway.id, rule.id, 1)}
                                disabled={isPublished || castaway.eliminated}
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  padding: 0,
                                  fontSize: "1rem",
                                  background: isPublished || castaway.eliminated ? "#9ca3af" : "#22c55e",
                                  color: "white",
                                  borderRadius: "4px",
                                  cursor: isPublished || castaway.eliminated ? "not-allowed" : "pointer"
                                }}
                              >
                                +
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default ScoringDashboard;
