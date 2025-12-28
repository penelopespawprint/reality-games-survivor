import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAdminLeague } from "@/context/AdminLeagueContext";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell } from "recharts";
import "./LeagueAnalytics.css";

interface DashboardStats {
  users: number;
  picks: number;
  castaways: number;
  weeks: number;
}


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

const LeagueAnalytics: React.FC = () => {
  const { getQueryParams } = useAdminLeague();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [winProbability, setWinProbability] = useState<any>(null);
  const [powerRankings, setPowerRankings] = useState<any>(null);
  const [castawaysStatus, setCastawaysStatus] = useState<any>(null);
  const [pickAccuracy, setPickAccuracy] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const queryParams = getQueryParams();
      const [statsRes, analyticsRes, winProbRes, powerRes, castawaysRes, accuracyRes, leaderboardRes] = await Promise.all([
        api.get("/api/admin/stats", { params: queryParams }),
        api.get("/api/admin/analytics", { params: queryParams }),
        api.get("/api/admin/analytics/win-probability", { params: queryParams }),
        api.get("/api/admin/analytics/power-rankings", { params: queryParams }),
        api.get("/api/admin/analytics/castaways-status", { params: queryParams }),
        api.get("/api/admin/analytics/pick-accuracy", { params: queryParams }),
        api.get("/api/admin/analytics/leaderboard", { params: queryParams })
      ]);

      setStats(statsRes.data);
      setAnalyticsData(analyticsRes.data);
      setWinProbability(winProbRes.data);
      setPowerRankings(powerRes.data);
      setCastawaysStatus(castawaysRes.data);
      setPickAccuracy(accuracyRes.data);
      setLeaderboard(leaderboardRes.data);
    } catch (error) {
      console.error("Failed to load analytics data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds for analytics
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData, getQueryParams]);

  if (loading) {
    return (
      <div className="league-analytics">
        <div className="league-analytics__loading">Loading league analytics...</div>
      </div>
    );
  }

  return (
    <main role="main" aria-label="League Analytics" className="league-analytics">
      <header className="league-analytics__header" aria-labelledby="analytics-header-title" style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: "12px",
        padding: "2rem",
        marginBottom: "2.5rem",
        color: "white",
        boxShadow: "0 10px 30px rgba(102, 126, 234, 0.2)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 id="analytics-header-title" style={{ margin: "0 0 0.5rem 0", fontSize: "2.5rem", fontWeight: 700 }}>League Insights & Trends</h1>
            <p style={{ margin: 0, fontSize: "1.05rem", opacity: 0.95 }}>Real-time analytics and performance metrics</p>
          </div>
          <button onClick={loadData} style={{
            background: "rgba(255, 255, 255, 0.2)",
            border: "2px solid rgba(255, 255, 255, 0.4)",
            color: "white",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 600,
            marginTop: "0.5rem",
            transition: "all 0.3s ease"
          }}>
            🔄 Refresh
          </button>
        </div>
      </header>

{/* League Overview Stats */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}>
          <div style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>👥</div>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1f2937" }}>League Overview</h2>
        </div>
        {stats ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem"
          }}>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(59, 130, 246, 0.1)",
              border: "2px solid #3B82F6",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#1E3A8A", marginBottom: "0.5rem" }}>{stats.users}</div>
              <div style={{ fontSize: "0.95rem", color: "#6b7280", fontWeight: 500 }}>Total Players</div>
            </div>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(245, 158, 11, 0.1)",
              border: "2px solid #F59E0B",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#92400E", marginBottom: "0.5rem" }}>{stats.castaways}</div>
              <div style={{ fontSize: "0.95rem", color: "#6b7280", fontWeight: 500 }}>Castaways</div>
            </div>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.1)",
              border: "2px solid #EF4444",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#991B1B", marginBottom: "0.5rem" }}>{stats.weeks}</div>
              <div style={{ fontSize: "0.95rem", color: "#6b7280", fontWeight: 500 }}>Weeks Created</div>
            </div>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)",
              border: "2px solid #DC2626",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#7F1D1D", marginBottom: "0.5rem" }}>{stats.picks}</div>
              <div style={{ fontSize: "0.95rem", color: "#6b7280", fontWeight: 500 }}>Total Picks</div>
            </div>
          </div>
        ) : (
          <div className="league-analytics__empty-state">
            Failed to load statistics
          </div>
        )}
      </section>

      {/* Leaderboard & Worst Castaways - 1/2 + 1/2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", marginBottom: "2.5rem" }}>
        {/* Leaderboard Standings - 2/3 width */}
        {leaderboard && leaderboard.length > 0 && (
          <section style={{
            background: "white",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e5e5e5"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}>
              <div style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>🏅</div>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1f2937" }}>Current Leaderboard</h2>
            </div>
            <div style={{ overflowX: "auto", maxHeight: "500px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Rank</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Player</th>
                    <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: 600, color: "#374151" }}>Points</th>
                    <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: 600, color: "#374151" }}>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player: any, idx: number) => (
                    <tr key={player.id} style={{ borderBottom: "1px solid #e5e7eb", background: idx % 2 === 0 ? "white" : "#f9fafb" }}>
                      <td style={{ padding: "0.75rem", fontWeight: 600, color: "#1f2937" }}>
                        {player.rank === 1 && "🥇 "}
                        {player.rank === 2 && "🥈 "}
                        {player.rank === 3 && "🥉 "}
                        #{player.rank}
                      </td>
                      <td style={{ padding: "0.75rem", fontWeight: 600, color: "#1f2937", fontSize: "0.9rem" }}>{player.name}</td>
                      <td style={{ padding: "0.75rem", textAlign: "right", color: "#374151", fontWeight: 600 }}>{player.totalPoints}</td>
                      <td style={{ padding: "0.75rem", textAlign: "right", color: "#374151", fontSize: "0.9rem" }}>{player.avgPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Worst Castaways - 1/2 width */}
        {castawaysStatus && castawaysStatus.length > 0 && (
          <section style={{
            background: "white",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e5e5e5"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}>
              <div style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>📉</div>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1f2937" }}>Worst Castaways</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {castawaysStatus
                .filter((c: any) => !c.eliminated)
                .sort((a: any, b: any) => a.totalPoints - b.totalPoints)
                .slice(0, 5)
                .map((castaway: any, idx: number) => (
                  <div key={castaway.id} style={{
                    background: "#fff5f5",
                    padding: "1rem",
                    borderRadius: "8px",
                    borderLeft: "4px solid #ef4444"
                  }}>
                    <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "0.9rem" }}>{idx + 1}. {castaway.name}</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444", marginTop: "0.25rem" }}>{castaway.totalPoints} pts</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>Drafted by {castaway.draftCount} player{castaway.draftCount !== 1 ? 's' : ''}</div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>

      {/* Full width: Win Probability Analysis - Chart View */}
      {winProbability && winProbability.probabilities && winProbability.probabilities.length > 0 && (
        <section style={{
          background: "white",
          borderRadius: "12px",
          padding: "2rem",
          marginBottom: "2.5rem",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e5e5e5"
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}>
            <div style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>🎯</div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1f2937" }}>Win Probability Analysis</h2>
            <span style={{ marginLeft: "auto", fontSize: "0.85rem", color: "#6b7280" }}>
              {winProbability.completedWeeks} weeks done, {winProbability.remainingWeeks} remaining
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              layout="vertical"
              data={winProbability.probabilities}
              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={145} fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #ccc", borderRadius: "6px" }}
                formatter={(value: any) => `${value}%`}
              />
              <Bar dataKey="winProbability" radius={[0, 8, 8, 0]}>
                {winProbability.probabilities.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.winProbability > 60 ? "#22c55e" : entry.winProbability > 30 ? "#f59e0b" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Two half-width charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", marginBottom: "2.5rem" }}>
        {/* Weekly Participation Chart */}
        {analyticsData && analyticsData.weeklyParticipation.length > 0 && (
          <section style={{
            background: "white",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e5e5e5"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}>
              <div style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>📈</div>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1f2937" }}>Weekly Participation</h2>
            </div>
            <div style={{ background: "#fafbfc", padding: "1.5rem", borderRadius: "8px" }}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.weeklyParticipation}>
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
        {analyticsData && analyticsData.scoringTrends.length > 0 && (
          <section style={{
            background: "white",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e5e5e5"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}>
              <div style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>📊</div>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1f2937" }}>Scoring Trends</h2>
            </div>
            <div style={{ background: "#fafbfc", padding: "1.5rem", borderRadius: "8px" }}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analyticsData.scoringTrends}>
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
      </div>

      {/* Two more half-width charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", marginBottom: "2.5rem" }}>
        {/* Pick Accuracy */}
        {pickAccuracy && pickAccuracy.length > 0 && (
          <section style={{
            background: "white",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e5e5e5"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}>
              <div style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>🎲</div>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1f2937" }}>Pick Accuracy</h2>
            </div>
            <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Player</th>
                    <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 600, color: "#374151" }}>Draft Acc</th>
                  </tr>
                </thead>
                <tbody>
                  {pickAccuracy.map((player: any, idx: number) => (
                    <tr key={player.userId} style={{ borderBottom: "1px solid #e5e7eb", background: idx % 2 === 0 ? "white" : "#f9fafb" }}>
                      <td style={{ padding: "0.75rem", fontWeight: 600, color: "#1f2937", fontSize: "0.9rem" }}>{player.name}</td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        <strong style={{ color: player.draftAccuracy > 70 ? "#22c55e" : player.draftAccuracy > 40 ? "#f59e0b" : "#ef4444" }}>{player.draftAccuracy}%</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Power Rankings - Chart View */}
        {powerRankings && powerRankings.length > 0 && (
          <section style={{
            background: "white",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e5e5e5"
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}>
              <div style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>🏆</div>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1f2937" }}>Power Rankings</h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                layout="vertical"
                data={powerRankings.slice(0, 8)}
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={115} fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #ccc", borderRadius: "6px" }}
                />
                <Bar dataKey="powerScore" fill="#3B82F6" name="Power Score" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}
      </div>

    </main>
  );
};

export default LeagueAnalytics;
