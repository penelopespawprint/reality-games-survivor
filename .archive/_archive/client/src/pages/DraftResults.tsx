import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLeague } from "@/context/LeagueContext";

/**
 * Draft Results Page
 * Shows draft picks in snake order with user's picks highlighted
 */

interface Castaway {
  id: string;
  name: string;
  tribe?: string;
  imageUrl?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface DraftPick {
  id: string;
  userId: string;
  castawayId: string;
  round: number;
  pickNumber: number;
  user: User;
  castaway: Castaway;
}

interface DraftStatus {
  draftStatus: "PENDING" | "COMPLETED";
  draftRunAt: string | null;
  picks: DraftPick[];
}

const DraftResults: React.FC = () => {
  const { user } = useAuth();
  const { selectedLeague } = useLeague();
  const [status, setStatus] = useState<DraftStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchDraftStatus = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        if (selectedLeague?.id) {
          headers["x-league-id"] = selectedLeague.id;
        }

        const response = await fetch(`${apiBase}/api/draft/status`, {
          headers,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch draft status");
        }

        const data = await response.json();
        setStatus(data);
      } catch (err: any) {
        setError(err.message || "Failed to load draft results");
      } finally {
        setLoading(false);
      }
    };

    fetchDraftStatus();
  }, [apiBase, selectedLeague]);

  // Group picks by round
  const picksByRound = status?.picks.reduce((acc, pick) => {
    const round = pick.round;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(pick);
    return acc;
  }, {} as Record<number, DraftPick[]>) || {};

  const rounds = Object.keys(picksByRound).map(Number).sort((a, b) => a - b);

  // Get unique users for the draft board
  const uniqueUsers = status?.picks
    ? Array.from(
        new Map(status.picks.map((p) => [p.userId, p.user])).values()
      )
    : [];

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #f3f3f3",
            borderTop: "4px solid var(--brand-red)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 1rem",
          }}
        />
        <p style={{ color: "var(--text-muted)" }}>Loading draft results...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <div
          style={{
            background: "#fee2e2",
            color: "#dc2626",
            padding: "1rem",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (status?.draftStatus === "PENDING") {
    return (
      <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "3rem",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "1rem",
            }}
          >

          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--text-dark)",
              marginBottom: "0.5rem",
            }}
          >
            Draft Not Yet Run
          </h1>
          <p
            style={{
              fontSize: "1rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            The draft will run after rankings are submitted. Make sure to submit
            your castaway rankings before the deadline!
          </p>
          <a
            href="/preseason-rank"
            style={{
              display: "inline-block",
              marginTop: "1.5rem",
              padding: "0.875rem 2rem",
              background: "var(--brand-red)",
              color: "white",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Submit Rankings
          </a>
        </div>
      </div>
    );
  }

  return (
    <main role="main" aria-label="Draft Results" style={{ padding: "1.5rem" }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .draft-pick-card {
          animation: fadeIn 0.3s ease-out;
          animation-fill-mode: both;
        }
        .draft-pick-card:nth-child(1) { animation-delay: 0.05s; }
        .draft-pick-card:nth-child(2) { animation-delay: 0.1s; }
        .draft-pick-card:nth-child(3) { animation-delay: 0.15s; }
        .draft-pick-card:nth-child(4) { animation-delay: 0.2s; }
        .draft-pick-card:nth-child(5) { animation-delay: 0.25s; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "var(--text-dark)",
            marginBottom: "0.5rem",
          }}
        >
          Draft Results
        </h1>
        {status?.draftRunAt && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Draft completed on{" "}
            {new Date(status.draftRunAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* My Picks Summary */}
      {user && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            border: "2px solid var(--brand-red)",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--brand-red)",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>Your Team</span>
          </h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            {status?.picks
              .filter((p) => p.userId === user.id)
              .sort((a, b) => a.round - b.round)
              .map((pick) => (
                <div
                  key={pick.id}
                  style={{
                    background: "#f9fafb",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "var(--brand-red)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    {pick.round}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      {pick.castaway.name}
                    </div>
                    {pick.castaway.tribe && (
                      <div
                        style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                      >
                        {pick.castaway.tribe}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            {status?.picks.filter((p) => p.userId === user.id).length === 0 && (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                No picks assigned yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Draft Board by Round */}
      {rounds.map((round) => {
        const roundPicks = picksByRound[round] || [];
        // Snake draft: even rounds are reversed
        const orderedPicks =
          round % 2 === 0 ? [...roundPicks].reverse() : roundPicks;

        return (
          <div key={round} style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text-dark)",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  background: "var(--brand-red)",
                  color: "white",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                }}
              >
                Round {round}
              </span>
              {round % 2 === 0 && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontWeight: 400,
                  }}
                >
                  (Snake - reversed order)
                </span>
              )}
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {orderedPicks.map((pick, index) => {
                const isMyPick = user && pick.userId === user.id;
                return (
                  <div
                    key={pick.id}
                    className="draft-pick-card"
                    style={{
                      background: isMyPick ? "#fef3f3" : "white",
                      borderRadius: "10px",
                      padding: "1rem",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.06)",
                      border: isMyPick
                        ? "2px solid var(--brand-red)"
                        : "1px solid #e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    {/* Pick Number */}
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: isMyPick ? "var(--brand-red)" : "#e5e7eb",
                        color: isMyPick ? "white" : "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {pick.pickNumber}
                    </div>

                    {/* Castaway Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          color: "var(--text-dark)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {pick.castaway.name}
                      </div>
                      {pick.castaway.tribe && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {pick.castaway.tribe}
                        </div>
                      )}
                    </div>

                    {/* User */}
                    <div
                      style={{
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: isMyPick ? "var(--brand-red)" : "var(--text-muted)",
                          fontWeight: isMyPick ? 600 : 400,
                        }}
                      >
                        {isMyPick ? "YOU" : pick.user.name || pick.user.email.split("@")[0]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* No picks message */}
      {status?.picks.length === 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--text-muted)" }}>No draft picks found.</p>
        </div>
      )}
    </main>
  );
};

export default DraftResults;
