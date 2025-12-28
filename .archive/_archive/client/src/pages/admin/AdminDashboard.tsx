import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/shared/routes";
import { Link } from "react-router-dom";
import api from "@/lib/api";

interface Season {
  id: string;
  number: number;
  name: string;
  status: "COLLECTING" | "DRAFT_WEEK" | "ACTIVE" | "GRACE" | "ARCHIVED";
  isActive: boolean;
}

interface SeasonStats {
  users: number;
  picks: number;
  castaways: number;
  weeks: number;
  leagues: number;
  officialLeagues: number;
  customLeagues: number;
  rankings: number;
  activeWeek: number | null;
}

interface DashboardStats {
  seasons: Season[];
  bySeasons: Record<string, SeasonStats>;
  global: {
    totalUsers: number;
    totalLeagues: number;
  };
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  COLLECTING: { bg: "#DBEAFE", text: "#1E40AF", label: "Collecting Signups" },
  DRAFT_WEEK: { bg: "#FEF3C7", text: "#92400E", label: "Draft Week" },
  ACTIVE: { bg: "#D1FAE5", text: "#065F46", label: "Active Season" },
  GRACE: { bg: "#E0E7FF", text: "#4338CA", label: "Grace Period" },
  ARCHIVED: { bg: "#F3F4F6", text: "#4B5563", label: "Archived" }
};

const adminLinks = [
  { label: "Weekly Scoring", to: routes.admin.scoring, icon: "📊", desc: "Enter weekly scores" },
  { label: "Picks Manager", to: routes.admin.picks, icon: "🎯", desc: "Manage draft picks" },
  { label: "Season Manager", to: routes.admin.season, icon: "📅", desc: "Manage seasons & weeks" },
  { label: "League Manager", to: routes.admin.leagueManager, icon: "🏆", desc: "View all leagues" },
  { label: "Castaways", to: routes.admin.castaways, icon: "🏝️", desc: "Manage contestants" },
  { label: "User Management", to: routes.admin.users, icon: "👥", desc: "Manage users" },
  { label: "Analytics", to: routes.admin.analytics, icon: "📈", desc: "View insights" },
  { label: "System Stats", to: routes.admin.stats, icon: "⚙️", desc: "System health" }
];

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, seasonsRes] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/seasons").catch(() => ({ data: [] }))
      ]);

      const seasons = seasonsRes.data || [];
      const activeSeason = seasons.find((s: Season) => s.isActive);

      setStats({
        seasons,
        bySeasons: statsRes.data.bySeasons || {},
        global: {
          totalUsers: statsRes.data.users || 0,
          totalLeagues: statsRes.data.leagues || 0
        }
      });

      if (activeSeason) {
        setSelectedSeason(activeSeason.id);
      } else if (seasons.length > 0) {
        setSelectedSeason(seasons[0].id);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentSeasonStats: SeasonStats | undefined = selectedSeason ? stats?.bySeasons?.[selectedSeason] : undefined;
  const selectedSeasonData = stats?.seasons?.find(s => s.id === selectedSeason);

  return (
    <main role="main" aria-label="Admin Dashboard" className="rg-page">
      {/* Header */}
      <section className="rg-hero" aria-labelledby="admin-title" style={{ paddingBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span className="rg-pill">League Command Center</span>
            <h1 id="admin-title" style={{ marginTop: "0.5rem" }}>Welcome, {user?.name ?? "Admin"}</h1>
            <p style={{ maxWidth: "500px", marginTop: "0.5rem" }}>
              Manage seasons, run drafts, enter scores, and keep your fantasy leagues running smoothly.
            </p>
          </div>

          {/* Season Selector */}
          {stats?.seasons && stats.seasons.length > 0 && (
            <div style={{
              background: "#fff",
              border: "2px solid #E5E7EB",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              minWidth: "280px"
            }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Active Context
              </label>
              <select
                value={selectedSeason || ""}
                onChange={(e) => setSelectedSeason(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  border: "2px solid #E5E7EB",
                  borderRadius: "8px",
                  background: "#F9FAFB",
                  cursor: "pointer"
                }}
              >
                {stats.seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    Season {season.number} - {statusColors[season.status]?.label || season.status}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Season Status Banner */}
      {selectedSeasonData && (
        <div style={{
          background: statusColors[selectedSeasonData.status]?.bg || "#F3F4F6",
          color: statusColors[selectedSeasonData.status]?.text || "#374151",
          padding: "1rem 1.5rem",
          borderRadius: "8px",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div>
            <strong style={{ fontSize: "1.125rem" }}>Season {selectedSeasonData.number}: {selectedSeasonData.name}</strong>
            <span style={{
              marginLeft: "1rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              background: "rgba(0,0,0,0.1)"
            }}>
              {statusColors[selectedSeasonData.status]?.label || selectedSeasonData.status}
            </span>
          </div>
          {selectedSeasonData.status === "COLLECTING" && (
            <Link to={routes.admin.season} style={{
              background: statusColors[selectedSeasonData.status]?.text,
              color: "#fff",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none"
            }}>
              Start Draft Week →
            </Link>
          )}
          {selectedSeasonData.status === "DRAFT_WEEK" && (
            <Link to={routes.admin.picks} style={{
              background: statusColors[selectedSeasonData.status]?.text,
              color: "#fff",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none"
            }}>
              Run Draft →
            </Link>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#374151" }}>
          {selectedSeasonData ? `Season ${selectedSeasonData.number} Overview` : "Overview"}
        </h2>
        {loading ? (
          <p>Loading stats...</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem"
          }}>
            <StatCard
              value={currentSeasonStats?.users || stats?.global.totalUsers || 0}
              label="Players"
              color="#3B82F6"
              icon="👥"
            />
            <StatCard
              value={currentSeasonStats?.leagues || stats?.global.totalLeagues || 0}
              label="Leagues"
              color="#10B981"
              icon="🏆"
              subtext={currentSeasonStats ? `${currentSeasonStats.officialLeagues} official` : undefined}
            />
            <StatCard
              value={currentSeasonStats?.castaways || 0}
              label="Castaways"
              color="#F59E0B"
              icon="🏝️"
            />
            <StatCard
              value={currentSeasonStats?.picks || 0}
              label="Draft Picks"
              color="#EF4444"
              icon="🎯"
            />
            <StatCard
              value={currentSeasonStats?.rankings || 0}
              label="Rankings"
              color="#8B5CF6"
              icon="📋"
            />
            <StatCard
              value={currentSeasonStats?.activeWeek || "-"}
              label="Active Week"
              color="#06B6D4"
              icon="📅"
            />
          </div>
        )}
      </section>

      {/* All Seasons Overview */}
      {stats?.seasons && stats.seasons.length > 1 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#374151" }}>All Seasons</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem"
          }}>
            {stats.seasons.map((season) => {
              const seasonStats = stats.bySeasons?.[season.id];
              return (
                <div
                  key={season.id}
                  onClick={() => setSelectedSeason(season.id)}
                  style={{
                    background: season.id === selectedSeason ? "#F0F9FF" : "#fff",
                    border: season.id === selectedSeason ? "2px solid #3B82F6" : "2px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.125rem" }}>Season {season.number}</h3>
                      <p style={{ color: "#6B7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        {season.name}
                      </p>
                    </div>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      background: statusColors[season.status]?.bg,
                      color: statusColors[season.status]?.text
                    }}>
                      {statusColors[season.status]?.label || season.status}
                    </span>
                  </div>
                  {seasonStats && (
                    <div style={{
                      display: "flex",
                      gap: "1.5rem",
                      marginTop: "1rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid #E5E7EB",
                      fontSize: "0.875rem",
                      color: "#6B7280"
                    }}>
                      <span><strong>{seasonStats.users || 0}</strong> players</span>
                      <span><strong>{seasonStats.leagues || 0}</strong> leagues</span>
                      <span><strong>{seasonStats.castaways || 0}</strong> castaways</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#374151" }}>Quick Actions</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem"
        }}>
          {adminLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                background: "#fff",
                border: "2px solid #E5E7EB",
                borderRadius: "12px",
                padding: "1.25rem",
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3B82F6";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span style={{ fontSize: "1.75rem" }}>{link.icon}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{link.label}</h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#6B7280", marginTop: "0.25rem" }}>
                  {link.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

const StatCard: React.FC<{
  value: number | string;
  label: string;
  color: string;
  icon: string;
  subtext?: string;
}> = ({ value, label, color, icon, subtext }) => (
  <div style={{
    background: "#fff",
    border: `2px solid ${color}20`,
    borderRadius: "12px",
    padding: "1.25rem",
    textAlign: "center"
  }}>
    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{icon}</div>
    <div style={{ fontSize: "2rem", fontWeight: 700, color }}>{value}</div>
    <div style={{ color: "#6B7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>{label}</div>
    {subtext && (
      <div style={{ color: "#9CA3AF", fontSize: "0.75rem", marginTop: "0.25rem" }}>{subtext}</div>
    )}
  </div>
);

export default AdminDashboard;
