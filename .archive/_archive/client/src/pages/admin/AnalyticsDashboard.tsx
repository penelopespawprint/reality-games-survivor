import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "@/lib/api";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AnalyticsData {
  weeklyParticipation: Array<{ week: number; picks: number }>;
  userEngagement: Array<{ name: string; pickCount: number }>;
  scoringTrends: Array<{
    weekNumber: number;
    totalPoints: number;
    avgPoints: number;
    playerCount: number;
  }>;
  popularCastaways: Array<{
    castaway: { id: string; name: string } | undefined;
    draftCount: number;
  }>;
  userStats: {
    total: number;
    withPicks: number;
    withRankings: number;
    participationRate: number;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [winProbability, setWinProbability] = useState<any>(null);
  const [powerRankings, setPowerRankings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ OPTIMIZATION: Memoize data fetch function
  const loadAnalytics = useCallback(async () => {
    try {
      const [analyticsRes, winProbRes, powerRes] = await Promise.all([
        api.get("/api/admin/analytics"),
        api.get("/api/admin/analytics/win-probability"),
        api.get("/api/admin/analytics/power-rankings")
      ]);

      setData(analyticsRes.data);
      setWinProbability(winProbRes.data);
      setPowerRankings(powerRes.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="rg-page">
        <section className="rg-hero">
          <span className="rg-pill">Analytics Dashboard</span>
          <h1>Loading analytics...</h1>
        </section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rg-page">
        <section className="rg-hero">
          <span className="rg-pill">Analytics Dashboard</span>
          <h1>Error</h1>
          <p className="error">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <main role="main" aria-label="Analytics Dashboard" className="rg-page">
      <section className="rg-hero" aria-labelledby="analytics-title">
        <span className="rg-pill">Analytics Dashboard</span>
        <h1 id="analytics-title">League Insights & Trends</h1>
        <p>Track participation, engagement, and scoring patterns across your league.</p>
      </section>

      {/* User Stats Overview */}
      <section className="rg-section" style={{ marginTop: "2rem" }}>
        <h2>User Participation Overview</h2>
        <div className="rg-grid rg-grid--four" style={{ marginTop: "1rem" }}>
          <div className="rg-card" style={{ textAlign: "center", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "2.5rem", margin: 0, color: "var(--primary)" }}>
              {data.userStats.total}
            </h3>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Total Users</p>
          </div>
          <div className="rg-card" style={{ textAlign: "center", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "2.5rem", margin: 0, color: "var(--primary)" }}>
              {data.userStats.withRankings}
            </h3>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Submitted Rankings</p>
          </div>
          <div className="rg-card" style={{ textAlign: "center", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "2.5rem", margin: 0, color: "var(--primary)" }}>
              {data.userStats.withPicks}
            </h3>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Made Picks</p>
          </div>
          <div className="rg-card" style={{ textAlign: "center", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "2.5rem", margin: 0, color: "var(--primary)" }}>
              {data.userStats.participationRate}%
            </h3>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Participation Rate</p>
          </div>
        </div>
      </section>

      {/* Win Probability Analysis */}
      {winProbability && winProbability.probabilities && winProbability.probabilities.length > 0 && (
        <section className="rg-section" style={{ marginTop: "3rem" }}>
          <h2>Win Probability Analysis</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Based on {winProbability.completedWeeks} completed weeks, {winProbability.remainingWeeks} weeks remaining
          </p>
          <div className="rg-card" style={{ marginTop: "1rem", padding: "1.5rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Current Points</th>
                  <th>Avg/Week</th>
                  <th>Projected Final</th>
                  <th>Win Probability</th>
                </tr>
              </thead>
              <tbody>
                {winProbability.probabilities.map((p: any) => (
                  <tr key={p.userId}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.currentPoints}</td>
                    <td>{p.avgPointsPerWeek}</td>
                    <td>{p.projectedPoints}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{
                          width: "120px",
                          height: "24px",
                          backgroundColor: "#e5e7eb",
                          borderRadius: "12px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${p.winProbability}%`,
                            height: "100%",
                            backgroundColor: p.winProbability > 60 ? "#22c55e" :
                                           p.winProbability > 30 ? "#f59e0b" : "#ef4444",
                            transition: "width 0.3s ease"
                          }} />
                        </div>
                        <strong style={{
                          color: p.winProbability > 60 ? "#22c55e" :
                                 p.winProbability > 30 ? "#f59e0b" : "#ef4444"
                        }}>
                          {p.winProbability}%
                        </strong>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Power Rankings */}
      {powerRankings && powerRankings.length > 0 && (
        <section className="rg-section" style={{ marginTop: "3rem" }}>
          <h2>Power Rankings</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Overall performance ranking based on multiple metrics (not just points)
          </p>
          <div className="rg-card" style={{ marginTop: "1rem", padding: "1.5rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Power Score</th>
                  <th>Total Points</th>
                  <th>Consistency</th>
                  <th>Recent Form</th>
                </tr>
              </thead>
              <tbody>
                {powerRankings.map((r: any) => (
                  <tr key={r.userId}>
                    <td>
                      {r.powerRank === 1 && "🥇 "}
                      {r.powerRank === 2 && "🥈 "}
                      {r.powerRank === 3 && "🥉 "}
                      <strong>#{r.powerRank}</strong>
                    </td>
                    <td><strong>{r.name}</strong></td>
                    <td>
                      <span style={{
                        padding: "0.35rem 0.75rem",
                        backgroundColor: r.powerRank <= 3 ? "#22c55e" :
                                       r.powerRank <= 6 ? "#f59e0b" : "#94a3b8",
                        color: "white",
                        borderRadius: "6px",
                        fontWeight: "600"
                      }}>
                        {r.powerScore}
                      </span>
                    </td>
                    <td>{r.metrics.totalPoints}</td>
                    <td>{r.metrics.consistencyScore}%</td>
                    <td>{r.metrics.recentForm}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Weekly Participation Chart */}
      {data.weeklyParticipation.length > 0 && (
        <section className="rg-section" style={{ marginTop: "3rem" }}>
          <h2>Weekly Participation</h2>
          <p style={{ color: "var(--text-muted)" }}>Number of picks submitted each week</p>
          <div className="rg-card" style={{ marginTop: "1rem", padding: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weeklyParticipation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" label={{ value: "Week", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "Picks", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="picks" fill="#8884d8" name="Picks Submitted" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Scoring Trends Chart */}
      {data.scoringTrends.length > 0 && (
        <section className="rg-section" style={{ marginTop: "3rem" }}>
          <h2>Scoring Trends</h2>
          <p style={{ color: "var(--text-muted)" }}>Average points per week</p>
          <div className="rg-card" style={{ marginTop: "1rem", padding: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.scoringTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekNumber" label={{ value: "Week", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "Avg Points", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgPoints" stroke="#82ca9d" name="Avg Points" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* User Engagement */}
      <section className="rg-section" style={{ marginTop: "3rem" }}>
        <h2>User Engagement</h2>
        <p style={{ color: "var(--text-muted)" }}>Total picks by user (top 10)</p>
        <div className="rg-card" style={{ marginTop: "1rem", padding: "1.5rem" }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.userEngagement.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: "Picks", position: "insideBottom", offset: -5 }} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pickCount" fill="#ffc658" name="Total Picks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Popular Castaways */}
      {data.popularCastaways.length > 0 && (
        <section className="rg-section" style={{ marginTop: "3rem" }}>
          <h2>Most Drafted Castaways</h2>
          <div className="rg-grid rg-grid--three" style={{ marginTop: "1rem" }}>
            {data.popularCastaways.slice(0, 6).map((item, index) => (
              <div key={index} className="rg-card" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.5rem", margin: 0 }}>{item.castaway?.name || "Unknown"}</h3>
                <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
                  Drafted {item.draftCount} {item.draftCount === 1 ? "time" : "times"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Raw Data Tables */}
      <section className="rg-section" style={{ marginTop: "3rem" }}>
        <h2>Detailed Metrics</h2>

        {/* Weekly Participation Table */}
        {data.weeklyParticipation.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Weekly Participation Breakdown</h3>
            <table style={{ marginTop: "0.75rem" }}>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Picks Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.weeklyParticipation.map((wp) => (
                  <tr key={wp.week}>
                    <td>Week {wp.week}</td>
                    <td>{wp.picks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* User Engagement Table */}
        {data.userEngagement.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3>User Engagement Details</h3>
            <table style={{ marginTop: "0.75rem" }}>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Total Picks</th>
                </tr>
              </thead>
              <tbody>
                {data.userEngagement.map((ue, index) => (
                  <tr key={index}>
                    <td>{ue.name}</td>
                    <td>{ue.pickCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default AnalyticsDashboard;
