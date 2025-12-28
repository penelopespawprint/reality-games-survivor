import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useLeague } from "@/context/LeagueContext";
import LeagueSwitcher from "@/components/LeagueSwitcher";
import { DraftPick } from "@/shared/types";
import { socket } from "@/lib/socket";
import { SkeletonLeaderboard, LoadingError, EmptyLeaderboard } from "@/components/ui";

interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  totalPoints: number;
  rawPoints: number;
  draftPicks?: DraftPick[];
  rank?: number;
}

interface WeeklyPick {
  id: string;
  userId: string;
  weekNumber: number;
  castaway: {
    id: string;
    name: string;
  };
}

type LeaderboardTab = "live" | "weekly" | "members";

const Leaderboard: React.FC = () => {
  const { selectedLeague } = useLeague();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LeaderboardTab>("live");
  const [isLive, setIsLive] = useState(false);
  const [weeksInFirst, setWeeksInFirst] = useState<number>(0);
  const [weeklyPicks, setWeeklyPicks] = useState<WeeklyPick[]>([]);

  useEffect(() => {
    if (!selectedLeague) {
      setEntries([]);
      setWeeklyPicks([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Initial data fetch
    Promise.all([
      api.get(`/api/leagues/${selectedLeague.id}/standings`),
      api.get(`/api/leagues/${selectedLeague.id}/picks`)
    ])
      .then(([standingsRes, picksRes]) => {
        if (!isMounted) return;

        setEntries(standingsRes.data.standings || []);
        setWeeklyPicks(picksRes.data.picks || []);
        setError(null);
        setLoading(false);

        // Calculate weeks in first for leader
        const leader = standingsRes.data.standings?.[0];
        if (leader) {
          // TODO: Implement weeks-in-first API endpoint
          setWeeksInFirst(0);
        }
      })
      .catch(() => {
        if (!isMounted) return;

        setEntries([]);
        setError("Unable to load leaderboard right now.");
        setLoading(false);
      });

    // Socket.io listeners for real-time updates
    const handleConnect = () => {
      setIsLive(true);
      socket.emit("join:leaderboard");
      console.log("Leaderboard connected to real-time updates");
    };

    const handleDisconnect = () => {
      setIsLive(false);
      console.log("Leaderboard disconnected from real-time updates");
    };

    const handleLeaderboardUpdate = (newStandings: LeaderboardEntry[]) => {
      if (!isMounted) return;
      console.log("Received real-time leaderboard update:", newStandings);
      setEntries(newStandings);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("leaderboard:updated", handleLeaderboardUpdate);

    // Set initial connection state and join room
    if (socket.connected) {
      setIsLive(true);
      socket.emit("join:leaderboard");
    }

    // Cleanup listeners on unmount
    return () => {
      isMounted = false;
      socket.emit("leave:leaderboard");
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("leaderboard:updated", handleLeaderboardUpdate);
    };
  }, [selectedLeague]);

  return (
    <main className="rg-page" role="main" aria-label="Leaderboard">
      <section className="rg-hero" aria-labelledby="leaderboard-title">
        <span className="rg-pill">Leaderboard</span>
        <h1 id="leaderboard-title" style={{ width: "100%" }}>Leaderboard</h1>
        <p>Rankings are updated by noon every Thursday.</p>
        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/global-leaderboard">
            <button className="button-secondary">
              🌎 View Global Leaderboard
            </button>
          </Link>
        </div>
      </section>

      <section className="rg-section">
        <LeagueSwitcher />
      </section>

      {/* Stats Overview */}
      {!loading && !error && entries.length > 0 && (
        <section className="rg-section">
          <h2>League Overview</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1.5rem",
            maxWidth: "100%"
          }}>
            <div style={{
              aspectRatio: "1",
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              border: "3px solid #3B82F6"
            }}>
              <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#1E3A8A" }}>
                {entries.length}
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
                Total Players
              </div>
            </div>

            <div style={{
              aspectRatio: "1",
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              border: "3px solid var(--brand-red)"
            }}>
              <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "var(--brand-red)" }}>
                {entries[0]?.totalPoints || 0}
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
                Top Score
              </div>
            </div>

            <div style={{
              aspectRatio: "1",
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              border: "3px solid #F59E0B"
            }}>
              <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#92400E" }}>
                {entries.length > 0 ? Math.round(entries.reduce((sum, e) => sum + e.totalPoints, 0) / entries.length) : 0}
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
                Average Points
              </div>
            </div>

            <div style={{
              aspectRatio: "1",
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              border: "3px solid #EF4444"
            }}>
              <div style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1, color: "#991B1B" }}>
                {entries.reduce((sum, e) => sum + (e.draftPicks?.length || 0), 0)}
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
                Total Picks
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rg-section">
        {loading && (
          <div style={{ marginBottom: "2rem" }}>
            <SkeletonLeaderboard rows={8} />
          </div>
        )}

        {error && !loading && (
          <LoadingError
            resource="leaderboard"
            error={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {!loading && !error && (
        <>
        <div className="rg-tabs" role="tablist" aria-label="Leaderboard views">
          <button
            type="button"
            className={`rg-tab ${tab === "live" ? "active" : ""}`}
            onClick={() => setTab("live")}
            role="tab"
            aria-selected={tab === "live"}
            aria-controls="leaderboard-panel"
          >
            Live Rankings
          </button>
          <button
            type="button"
            className={`rg-tab ${tab === "weekly" ? "active" : ""}`}
            onClick={() => setTab("weekly")}
            role="tab"
            aria-selected={tab === "weekly"}
            aria-controls="leaderboard-panel"
          >
            Weekly Picks
          </button>
          <button
            type="button"
            className={`rg-tab ${tab === "members" ? "active" : ""}`}
            onClick={() => setTab("members")}
            role="tab"
            aria-selected={tab === "members"}
            aria-controls="leaderboard-panel"
          >
            League Members
          </button>
        </div>

        {entries.length === 0 && <EmptyLeaderboard />}

        {tab === "live" && entries.length > 0 && (
          <table role="table" aria-label="Live rankings table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Player</th>
                <th scope="col">Total Points</th>
                <th scope="col">Roster</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => {
                const picks = entry.draftPicks ?? [];
                const allPicksEliminated = picks.length > 0 && picks.every((pick) => pick.castaway.eliminated);

                return (
                  <tr key={entry.id} style={{ opacity: allPicksEliminated ? 0.6 : 1 }}>
                    <td>{index + 1}</td>
                    <td>{entry.name}</td>
                    <td>{entry.totalPoints}</td>
                    <td>
                      {allPicksEliminated ? (
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>🔥 The tribe has spoken.</span>
                      ) : (
                        picks.map((pick) => pick.castaway.name).join(", ") || "--"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === "weekly" && (
          <div className="rg-grid">
            {entries.map((entry) => {
              // Get weekly picks for this user, sorted by week descending
              const userPicks = weeklyPicks
                .filter(p => p.userId === entry.id)
                .sort((a, b) => b.weekNumber - a.weekNumber);

              return (
                <article key={entry.id} className="rg-card">
                  <h3>{entry.name}</h3>
                  <p className="text-muted">{entry.email}</p>
                  <p className="mt-2" style={{ fontWeight: 600 }}>Weekly Picks (latest first)</p>
                  <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
                    {userPicks.map((pick) => (
                      <li key={pick.id}>Week {pick.weekNumber}: {pick.castaway.name}</li>
                    ))}
                    {userPicks.length === 0 && <li>No weekly picks yet.</li>}
                  </ul>
                </article>
              );
            })}
          </div>
        )}

        {tab === "members" && (
          <div className="rg-grid rg-grid--three">
            {entries.map((entry, index) => {
              const picks = entry.draftPicks ?? [];
              const allPicksEliminated = picks.length > 0 && picks.every((pick) => pick.castaway.eliminated);

              return (
                <div key={entry.id} className="rg-card" style={{ opacity: allPicksEliminated ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 0.5rem 0" }}>{entry.name}</h3>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>{entry.email}</p>
                      {allPicksEliminated && (
                        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "#ef4444", fontWeight: 600 }}>
                          🔥 The tribe has spoken.
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600", color: "var(--brand-red)" }}>#{index + 1}</p>
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#666" }}>{entry.totalPoints} pts</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        )}
      </section>

      {!loading && !error && entries.length > 0 && (
        <section className="rg-section">
          <h2>First Place Spotlight</h2>
          {(() => {
            const leader = entries[0];
            const leaderPicks = leader?.draftPicks ?? [];
            const leaderEliminated = leaderPicks.length > 0 && leaderPicks.every((pick) => pick.castaway.eliminated);

            return (
              <div className="rg-grid rg-grid--four">
                <div className="rg-card" style={{ borderLeft: "4px solid var(--brand-red)" }}>
                  <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem 0" }}>Current Leader</h3>
                  <p style={{ fontSize: "1.5rem", fontWeight: "600", margin: "0 0 0.25rem 0", color: leaderEliminated ? "#ef4444" : "var(--brand-red)" }}>
                    {leader?.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
                    {leaderEliminated ? "🔥 The tribe has spoken." : "Leading the pack"}
                  </p>
                </div>

                <div className="rg-card" style={{ borderLeft: "4px solid var(--brand-red)" }}>
                  <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem 0" }}>Total Points</h3>
                  <p style={{ fontSize: "1.5rem", fontWeight: "600", margin: "0 0 0.25rem 0", color: "var(--brand-red)" }}>
                    {leader?.totalPoints}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
                    Points earned
                  </p>
                </div>

                <div className="rg-card" style={{ borderLeft: "4px solid var(--brand-red)" }}>
                  <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem 0" }}>Lead Margin</h3>
                  <p style={{ fontSize: "1.5rem", fontWeight: "600", margin: "0 0 0.25rem 0", color: "var(--brand-red)" }}>
                    {entries.length > 1 && entries[0] && entries[1]
                      ? `+${Math.abs(entries[0].totalPoints - entries[1].totalPoints)}`
                      : "—"}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
                    Points ahead of 2nd
                  </p>
                </div>

                <div className="rg-card" style={{ borderLeft: "4px solid var(--brand-red)" }}>
                  <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem 0" }}>Weeks in #1</h3>
                  <p style={{ fontSize: "1.5rem", fontWeight: "600", margin: "0 0 0.25rem 0", color: "var(--brand-red)" }}>
                    {weeksInFirst}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
                    Weeks at the top
                  </p>
                </div>
              </div>
            );
          })()}
        </section>
      )}
    </main>
  );
};

export default Leaderboard;
