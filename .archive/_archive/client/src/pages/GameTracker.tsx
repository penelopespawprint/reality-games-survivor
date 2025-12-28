import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

interface Castaway {
  id: string;
  name: string;
  age: number;
  hometown: string;
  occupation: string;
  tribe: string;
  eliminated: boolean;
}

const GameTracker: React.FC = () => {
  const [castaways, setCastaways] = useState<Castaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "eliminated">("all");
  const navigate = useNavigate();

  const tribeColors: Record<string, { bg: string; accent: string; light: string }> = {
    Kele: { bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", accent: "#667eea", light: "#e0e7ff" },
    Hina: { bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", accent: "#f5576c", light: "#ffe4e6" },
    Uli: { bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", accent: "#4facfe", light: "#dbeafe" },
    Solewa: { bg: "linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)", accent: "#dc2626", light: "#fef3c7" }
  };

  const getTribeColors = (tribe: string | null) => {
    if (!tribe || !tribeColors[tribe]) {
      return { bg: "linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)", accent: "#6B7280", light: "#f3f4f6" };
    }
    return tribeColors[tribe];
  };

  useEffect(() => {
    api
      .get("/api/castaways")
      .then((res) => {
        setCastaways(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load castaways");
        setLoading(false);
      });
  }, []);

  const getImagePath = (name: string) => {
    let imageName = name;
    if (name.includes("MC")) {
      imageName = 'Michelle MC Chukwujekwu';
    } else if (name.includes("Annie")) {
      imageName = 'Kimberly Annie Davis';
    }
    return `/images/${imageName}.webp`;
  };

  if (loading) {
    return (
      <div className="rg-page">
        <div style={{ textAlign: "center", padding: "4rem", color: "#666" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div>Loading castaways...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rg-page">
        <div className="error">{error}</div>
      </div>
    );
  }

  const filteredCastaways = castaways.filter(c => {
    if (filter === "active") return !c.eliminated;
    if (filter === "eliminated") return c.eliminated;
    return true;
  });

  const groupedByTribe = filteredCastaways.reduce((acc, castaway) => {
    if (!acc[castaway.tribe]) {
      acc[castaway.tribe] = [];
    }
    acc[castaway.tribe].push(castaway);
    return acc;
  }, {} as Record<string, Castaway[]>);

  const totalCastaways = castaways.length;
  const eliminatedCount = castaways.filter((c) => c.eliminated).length;
  const remainingCount = totalCastaways - eliminatedCount;

  return (
    <main role="main" aria-label="Game Tracker" className="rg-page">
      <section className="rg-hero" aria-labelledby="tracker-title">
        <span className="rg-pill">Game Tracker</span>
        <h1 id="tracker-title">Survivor 49 Castaways</h1>
        <p>Track every player's journey in the game</p>
      </section>

      {/* Stats Overview */}
      <section className="rg-section">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "1.5rem",
            textAlign: "center",
            border: "2px solid #e5e5e5"
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#3B82F6", marginBottom: "0.25rem" }}>
              {totalCastaways}
            </div>
            <div style={{ fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>Total Castaways</div>
          </div>
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "1.5rem",
            textAlign: "center",
            border: "2px solid #e5e5e5"
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#10B981", marginBottom: "0.25rem" }}>
              {remainingCount}
            </div>
            <div style={{ fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>Still In Game</div>
          </div>
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "1.5rem",
            textAlign: "center",
            border: "2px solid #e5e5e5"
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#EF4444", marginBottom: "0.25rem" }}>
              {eliminatedCount}
            </div>
            <div style={{ fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>Eliminated</div>
          </div>
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "1.5rem",
            textAlign: "center",
            border: "2px solid #e5e5e5"
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#8B5CF6", marginBottom: "0.25rem" }}>
              {Object.keys(groupedByTribe).length}
            </div>
            <div style={{ fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>Active Tribes</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              background: filter === "all" ? "var(--brand-red)" : "white",
              color: filter === "all" ? "white" : "#666",
              border: `2px solid ${filter === "all" ? "var(--brand-red)" : "#e5e5e5"}`,
              padding: "0.6rem 1.5rem",
              borderRadius: "10px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            All Castaways
          </button>
          <button
            onClick={() => setFilter("active")}
            style={{
              background: filter === "active" ? "#10B981" : "white",
              color: filter === "active" ? "white" : "#666",
              border: `2px solid ${filter === "active" ? "#10B981" : "#e5e5e5"}`,
              padding: "0.6rem 1.5rem",
              borderRadius: "10px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Active Players
          </button>
          <button
            onClick={() => setFilter("eliminated")}
            style={{
              background: filter === "eliminated" ? "#6B7280" : "white",
              color: filter === "eliminated" ? "white" : "#666",
              border: `2px solid ${filter === "eliminated" ? "#6B7280" : "#e5e5e5"}`,
              padding: "0.6rem 1.5rem",
              borderRadius: "10px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Eliminated
          </button>
        </div>
      </section>

      {/* Tribes */}
      {Object.keys(groupedByTribe).sort().map((tribe) => {
        const tribeCastaways = groupedByTribe[tribe] || [];
        const colors = getTribeColors(tribe);

        return (
          <section key={tribe} className="rg-section">
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.5rem",
              padding: "1rem 1.5rem",
              background: colors.light,
              borderRadius: "12px",
              border: `2px solid ${colors.accent}`
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: colors.bg,
                display: "grid",
                placeItems: "center",
                color: "white",
                fontWeight: 700,
                fontSize: "1.2rem"
              }}>
                {tribeCastaways.length}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.5rem", color: colors.accent }}>{tribe} Tribe</h2>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
                  {tribeCastaways.filter(c => !c.eliminated).length} active, {tribeCastaways.filter(c => c.eliminated).length} eliminated
                </p>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.5rem"
            }}>
              {tribeCastaways.map((castaway) => (
                <div
                  key={castaway.id}
                  onClick={() => navigate(`/castaway/${castaway.id}`)}
                  style={{
                    cursor: "pointer",
                    background: "white",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: `3px solid ${castaway.eliminated ? "#e5e5e5" : colors.accent}`,
                    transition: "all 0.3s ease",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => {
                    if (!castaway.eliminated) {
                      e.currentTarget.style.transform = "translateY(-8px)";
                      e.currentTarget.style.boxShadow = `0 12px 24px ${colors.accent}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Image Header */}
                  <div style={{
                    position: "relative",
                    height: "220px",
                    background: castaway.eliminated ? "#f3f4f6" : colors.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img
                      src={getImagePath(castaway.name)}
                      alt={castaway.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        filter: castaway.eliminated ? "grayscale(100%)" : "none",
                        opacity: castaway.eliminated ? 0.5 : 1
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/placeholder.png";
                      }}
                    />
                    {castaway.eliminated && (
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "#EF4444",
                        color: "white",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "12px",
                        fontWeight: 700,
                        fontSize: "1rem",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)"
                      }}>
                        Eliminated
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div style={{ padding: "1.25rem" }}>
                    <h3 style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: castaway.eliminated ? "#9ca3af" : "#1a1a1a"
                    }}>
                      {castaway.name}
                    </h3>

                    <div style={{
                      display: "inline-block",
                      padding: "0.4rem 0.8rem",
                      borderRadius: "8px",
                      background: castaway.eliminated ? "#f3f4f6" : colors.light,
                      color: castaway.eliminated ? "#6b7280" : colors.accent,
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "0.75rem"
                    }}>
                      {castaway.age} years old
                    </div>

                    <p style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "0.95rem",
                      color: "#4b5563",
                      fontWeight: 500
                    }}>
                      {castaway.occupation}
                    </p>

                    <p style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "#9ca3af"
                    }}>
                      {castaway.hometown?.split(" → ").join(" • ") || "Unknown"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
};

export default GameTracker;
