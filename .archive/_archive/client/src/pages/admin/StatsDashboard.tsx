import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAdminLeague } from "@/context/AdminLeagueContext";

interface AdminStats {
  users: number;
  picks: number;
  castaways: number;
  weeks: number;
}

const StatsDashboard = () => {
  const { getQueryParams } = useAdminLeague();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = getQueryParams();
    api
      .get("/api/admin/stats", { params: queryParams })
      .then(res => {
        setStats(res.data);
        setError(null);
      })
      .catch(err => {
        console.error("Failed to load stats:", err);
        setError("Unable to load stats.");
      });
  }, [getQueryParams]);

  if (error) {
    return <div className="rg-page" style={{ color: "crimson" }}>{error}</div>;
  }

  if (!stats) return <div className="rg-page">Loading stats…</div>;

  return (
    <main role="main" aria-label="Stats Dashboard" className="rg-page">
      <section className="rg-hero" aria-labelledby="stats-title">
        <span className="rg-pill">System Stats</span>
        <h1 id="stats-title">League health at a glance.</h1>
      </section>

      <section className="rg-section" style={{ marginTop: "3rem" }}>
        <div className="rg-grid rg-grid--two">
          <article className="rg-stat-card">
            <span>Total users</span>
            <strong>{stats.users}</strong>
          </article>
          <article className="rg-stat-card">
            <span>Total picks submitted</span>
            <strong>{stats.picks}</strong>
          </article>
          <article className="rg-stat-card">
            <span>Castaways in system</span>
            <strong>{stats.castaways}</strong>
          </article>
          <article className="rg-stat-card">
            <span>Weeks configured</span>
            <strong>{stats.weeks}</strong>
          </article>
        </div>
      </section>
    </main>
  );
};

export default StatsDashboard;
