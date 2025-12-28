import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { LoadingSpinner, LoadingError } from "@/components/ui";

interface Castaway {
  id: string;
  name: string;
  age: number;
  hometown: string;
  occupation: string;
  tribe: string;
}

interface WeeklyResult {
  weekNumber: number;
  points: number;
}

interface Owner {
  name: string;
  email: string;
}

const CastawayDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [castaway, setCastaway] = useState<Castaway | null>(null);
  const [weeklyResults, setWeeklyResults] = useState<WeeklyResult[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tribeColors: Record<string, { bg: string; border: string; text: string }> = {
    Kele: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
    Hina: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E3A8A" },
    Uli: { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" }
  };

  useEffect(() => {
    Promise.all([
      api.get(`/api/castaways/${id}`),
      api.get(`/api/castaways/${id}/weekly-results`),
      api.get(`/api/castaways/${id}/owner`)
    ])
      .then(([castawayRes, resultsRes, ownerRes]) => {
        setCastaway(castawayRes.data);
        setWeeklyResults(resultsRes.data);
        setOwner(ownerRes.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load castaway details");
        setLoading(false);
      });
  }, [id]);

  const getImagePath = (name: string) => {
    const imageName = name
      .replace("MC Chukwujekwu", "Michelle MC Chukwujekwu")
      .replace("Annie Davis", "Kimberly Annie Davis");
    return `/images/${imageName}.webp`;
  };

  if (loading) {
    return (
      <div className="rg-page">
        <LoadingSpinner size="lg" label="Loading castaway details..." />
      </div>
    );
  }

  if (error || !castaway) {
    return (
      <div className="rg-page">
        <LoadingError
          resource="castaway"
          error={error || "Castaway not found"}
          onRetry={() => window.location.reload()}
        />
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button onClick={() => navigate("/game-tracker")} className="button-secondary">
            Back to Game Tracker
          </button>
        </div>
      </div>
    );
  }

  const colors = tribeColors[castaway.tribe];
  const totalPoints = weeklyResults.reduce((sum, week) => sum + week.points, 0);
  const maxPoints = Math.max(...weeklyResults.map((w) => w.points), 1);

  // Fill in missing weeks with 0 points
  const allWeeks = Array.from({ length: 13 }, (_, i) => {
    const weekNumber = i + 1;
    const result = weeklyResults.find((w) => w.weekNumber === weekNumber);
    return {
      weekNumber,
      points: result?.points || 0
    };
  });

  return (
    <main role="main" aria-label="Castaway Details" className="rg-page">
      <button onClick={() => navigate("/game-tracker")} className="button-outline" style={{ marginBottom: "1rem" }}>
        ← Back to Game Tracker
      </button>

      <section className="rg-hero" style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}` }}>
        <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          <img
            src={getImagePath(castaway.name)}
            alt={castaway.name}
            style={{
              width: "200px",
              height: "200px",
              borderRadius: "12px",
              objectFit: "cover",
              border: `3px solid ${colors.border}`
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/placeholder.png";
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span className="rg-pill" style={{ background: colors.border, color: "#fff" }}>
                {castaway.tribe} Tribe
              </span>
            </div>
            <h1 style={{ margin: "0 0 0.5rem 0", color: colors.text }}>{castaway.name}</h1>
            <div style={{ display: "grid", gap: "0.25rem", color: colors.text }}>
              <p style={{ margin: 0, fontSize: "1.1rem" }}>
                <strong>Age:</strong> {castaway.age}
              </p>
              <p style={{ margin: 0, fontSize: "1.1rem" }}>
                <strong>Occupation:</strong> {castaway.occupation}
              </p>
              <p style={{ margin: 0, fontSize: "1.1rem" }}>
                <strong>Hometown:</strong> {castaway.hometown}
              </p>
            </div>
          </div>
        </div>
      </section>

      {owner && (
        <section className="rg-section">
          <h2>Owned By</h2>
          <div className="rg-card" style={{ display: "inline-block", minWidth: "250px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "var(--brand-red)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "600",
                  fontSize: "1.1rem"
                }}
              >
                {owner.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: "600", fontSize: "1rem" }}>{owner.name}</p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>{owner.email}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rg-section">
        <h2>Season Statistics</h2>
        <div className="rg-grid rg-grid--two">
          <div className="rg-stat-card">
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>Total Points</p>
            <strong style={{ fontSize: "2.5rem" }}>{totalPoints}</strong>
          </div>
          <div className="rg-stat-card">
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>Average Per Week</p>
            <strong style={{ fontSize: "2.5rem" }}>
              {weeklyResults.length > 0 ? Math.round(totalPoints / weeklyResults.length) : 0}
            </strong>
          </div>
        </div>
      </section>

      <section className="rg-section">
        <h2>Points Over Time</h2>
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "var(--radius)", border: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", height: "200px", alignItems: "flex-end", gap: "4px" }}>
            {allWeeks.map((week) => {
              const isUnranked = week.weekNumber <= 2;
              const cumulative = allWeeks
                .filter((w) => w.weekNumber <= week.weekNumber && w.weekNumber > 2)
                .reduce((sum, w) => sum + w.points, 0);
              const maxCumulative = Math.max(...allWeeks.map((_, idx) =>
                allWeeks.filter((w) => w.weekNumber <= idx + 1 && w.weekNumber > 2).reduce((s, w) => s + w.points, 0)
              ), 1);

              return (
                <div key={week.weekNumber} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "100%",
                      height: isUnranked ? "20px" : `${(cumulative / maxCumulative) * 100}%`,
                      background: isUnranked ? "#e5e5e5" : colors.border,
                      borderRadius: "4px 4px 0 0",
                      opacity: isUnranked ? 0.3 : 1,
                      transition: "height 0.3s ease"
                    }}
                    title={`Week ${week.weekNumber}: ${isUnranked ? "Not Ranked" : `${cumulative} total pts`}`}
                  />
                  <div style={{ fontSize: "0.7rem", color: "#666" }}>
                    {week.weekNumber}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#666", marginTop: "1rem", marginBottom: 0 }}>
            Cumulative points by week (weeks 1-2 not ranked)
          </p>
        </div>
      </section>

      <section className="rg-section">
        <h2>Weekly Performance</h2>
        <div style={{ overflowX: "auto" }}>
          <table role="table" aria-label="Weekly performance">
            <thead>
              <tr>
                <th scope="col">Week</th>
                <th scope="col">Points</th>
                <th scope="col" style={{ width: "60%" }}>Performance</th>
              </tr>
            </thead>
            <tbody>
              {allWeeks.map((week) => {
                const isUnranked = week.weekNumber <= 2;
                return (
                  <tr key={week.weekNumber} style={{ opacity: isUnranked ? 0.4 : 1 }}>
                    <td>
                      <strong>Week {week.weekNumber}</strong>
                      {isUnranked && <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#999" }}>(Not Ranked)</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: "1.1rem", fontWeight: "600", color: week.points > 0 ? "var(--brand-red)" : "var(--text-muted)" }}>
                        {isUnranked ? "—" : week.points}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                          style={{
                            flex: 1,
                            height: "24px",
                            background: isUnranked ? "#e5e5e5" : "var(--bg-cream)",
                            borderRadius: "4px",
                            overflow: "hidden"
                          }}
                        >
                          {!isUnranked && (
                            <div
                              style={{
                                height: "100%",
                                width: maxPoints > 0 ? `${(week.points / maxPoints) * 100}%` : "0%",
                                background: week.points > 0 ? colors.border : "transparent",
                                transition: "width 0.3s ease"
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default CastawayDetail;
