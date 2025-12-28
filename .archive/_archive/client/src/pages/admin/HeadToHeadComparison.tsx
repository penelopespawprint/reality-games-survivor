import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface User {
  id: string;
  name: string;
  totalPoints: number;
}

interface Comparison {
  user1: User;
  user2: User;
  weeklyComparison: Array<{
    week: number;
    user1Points: number;
    user2Points: number;
    winner: string;
  }>;
  summary: {
    user1Wins: number;
    user2Wins: number;
    ties: number;
    avgPointDiff: number;
  };
}

const HeadToHeadComparison = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [user1Id, setUser1Id] = useState("");
  const [user2Id, setUser2Id] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/api/users").then(res => setUsers(res.data));
  }, []);

  const handleCompare = async () => {
    if (!user1Id || !user2Id) return;

    setLoading(true);
    try {
      const res = await api.get(`/api/admin/analytics/head-to-head?user1=${user1Id}&user2=${user2Id}`);
      setComparison(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load comparison data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main role="main" aria-label="Head-to-Head Comparison" className="rg-page">
      <section className="rg-hero" aria-labelledby="h2h-title">
        <span className="rg-pill">Head-to-Head Analysis</span>
        <h1 id="h2h-title">Compare Players</h1>
        <p>Select two players to compare their performance head-to-head</p>
      </section>

      <section className="rg-section" style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label htmlFor="player1">Player 1</label>
            <select
              id="player1"
              value={user1Id}
              onChange={e => setUser1Id(e.target.value)}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              <option value="">Select Player 1</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: "1.5rem", fontWeight: "600", marginTop: "1.5rem" }}>vs</span>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <label htmlFor="player2">Player 2</label>
            <select
              id="player2"
              value={user2Id}
              onChange={e => setUser2Id(e.target.value)}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              <option value="">Select Player 2</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompare}
            disabled={!user1Id || !user2Id || loading}
            style={{ marginTop: "1.5rem", minWidth: "120px" }}
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>
      </section>

      {comparison && (
        <>
          <section className="rg-section" style={{ marginTop: "2rem" }}>
            <h2>Summary</h2>
            <div className="rg-grid rg-grid--three" style={{ marginTop: "1rem" }}>
              <div className="rg-card" style={{ textAlign: "center", padding: "1.5rem", backgroundColor: comparison.summary.user1Wins > comparison.summary.user2Wins ? "#dcfce7" : undefined }}>
                <h3 style={{ fontSize: "1.5rem", margin: 0 }}>{comparison.user1.name}</h3>
                <p style={{ fontSize: "2.5rem", fontWeight: "600", margin: "0.5rem 0", color: "var(--primary)" }}>
                  {comparison.summary.user1Wins}
                </p>
                <p style={{ color: "var(--text-muted)" }}>Wins</p>
                <p style={{ marginTop: "0.5rem" }}>Total: {comparison.user1.totalPoints} pts</p>
              </div>

              <div className="rg-card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.5rem", margin: 0 }}>Ties</h3>
                <p style={{ fontSize: "2.5rem", fontWeight: "600", margin: "0.5rem 0", color: "#94a3b8" }}>
                  {comparison.summary.ties}
                </p>
                <p style={{ color: "var(--text-muted)" }}>Weeks</p>
              </div>

              <div className="rg-card" style={{ textAlign: "center", padding: "1.5rem", backgroundColor: comparison.summary.user2Wins > comparison.summary.user1Wins ? "#dcfce7" : undefined }}>
                <h3 style={{ fontSize: "1.5rem", margin: 0 }}>{comparison.user2.name}</h3>
                <p style={{ fontSize: "2.5rem", fontWeight: "600", margin: "0.5rem 0", color: "var(--primary)" }}>
                  {comparison.summary.user2Wins}
                </p>
                <p style={{ color: "var(--text-muted)" }}>Wins</p>
                <p style={{ marginTop: "0.5rem" }}>Total: {comparison.user2.totalPoints} pts</p>
              </div>
            </div>
          </section>

          <section className="rg-section" style={{ marginTop: "2rem" }}>
            <h2>Weekly Performance</h2>
            <div className="rg-card" style={{ marginTop: "1rem", padding: "1.5rem" }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparison.weeklyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" label={{ value: "Week", position: "insideBottom", offset: -5 }} />
                  <YAxis label={{ value: "Points", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="user1Points" stroke="#3b82f6" name={comparison.user1.name} strokeWidth={2} />
                  <Line type="monotone" dataKey="user2Points" stroke="#10b981" name={comparison.user2.name} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rg-section" style={{ marginTop: "2rem" }}>
            <h2>Week-by-Week Breakdown</h2>
            <div className="rg-card" style={{ marginTop: "1rem", padding: "1.5rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>{comparison.user1.name}</th>
                    <th>{comparison.user2.name}</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.weeklyComparison.map(w => (
                    <tr key={w.week}>
                      <td><strong>Week {w.week}</strong></td>
                      <td style={{
                        fontWeight: w.winner === 'user1' ? '600' : 'normal',
                        color: w.winner === 'user1' ? '#22c55e' : undefined
                      }}>
                        {w.user1Points}
                      </td>
                      <td style={{
                        fontWeight: w.winner === 'user2' ? '600' : 'normal',
                        color: w.winner === 'user2' ? '#22c55e' : undefined
                      }}>
                        {w.user2Points}
                      </td>
                      <td>
                        {w.winner === 'user1' && <span style={{ color: '#22c55e' }}>✓ {comparison.user1.name}</span>}
                        {w.winner === 'user2' && <span style={{ color: '#22c55e' }}>✓ {comparison.user2.name}</span>}
                        {w.winner === 'tie' && <span style={{ color: '#94a3b8' }}>— Tie</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
};

export default HeadToHeadComparison;
