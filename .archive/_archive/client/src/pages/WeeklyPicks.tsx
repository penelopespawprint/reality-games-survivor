import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Castaway, isApiError, getErrorMessage } from "../shared/types";
import CountdownTimer from "@/components/CountdownTimer";
import { useLeague } from "@/context/LeagueContext";
import LeagueSwitcher from "@/components/LeagueSwitcher";
import { EmptyPicks, LoadingSpinner, LoadingError } from "@/components/ui";

type AssignedPick = {
  castawayId: string;
  castaway: Castaway;
  round: number;
};

type WeekInfo = {
  weekNumber: number;
  lockAt?: string | null;
  picksOpenAt?: string | null;
  picksCloseAt?: string | null;
};

type PickData = {
  castawayId: string;
  castaway: Castaway;
  isAutoSelected?: boolean;
  penaltyApplied?: boolean;
};

type UserData = {
  id: string;
  name: string;
  email: string;
};

type AllPicksData = {
  users: UserData[];
  picks: Array<{
    id: string;
    userId: string;
    castawayId: string;
    weekNumber: number;
    castaway: Castaway;
  }>;
  draftPicks: Array<{
    id: string;
    userId: string;
    castawayId: string;
    castaway: Castaway;
  }>;
  castaways: Castaway[];
  weeks: WeekInfo[];
};

const WeeklyPicks: React.FC = () => {
  const { selectedLeague } = useLeague();
  const [assigned, setAssigned] = useState<AssignedPick[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [previousPick, setPreviousPick] = useState<PickData | null>(null);
  const [suggestedCastaway, setSuggestedCastaway] = useState<Castaway | null>(null);
  const [currentPick, setCurrentPick] = useState<PickData | null>(null);
  const [allPicksData, setAllPicksData] = useState<AllPicksData | null>(null);
  const [viewMode, setViewMode] = useState<"my-picks" | "all-picks">("my-picks");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Reset state when league changes
    setAssigned([]);
    setSelectedId(null);
    setCurrentPick(null);
    setAllPicksData(null);
    setErrorMessage(null);
    setLoading(true);

    if (!selectedLeague) {
      setErrorMessage("Please select a league to view your picks.");
      setLoading(false);
      return;
    }

    async function load() {
      const headers = { 'x-league-id': selectedLeague!.id };

      try {
        const [myPicksRes, allPicksRes] = await Promise.all([
          api.get("/api/picks/me", { headers }),
          api.get("/api/picks/all", { headers })
        ]);

        if (!isMounted) return;

        if (!myPicksRes.data) {
          setErrorMessage("No active week is available yet.");
          return;
        }
        setAssigned(myPicksRes.data.assigned ?? []);

        if (myPicksRes.data.pick?.castawayId) {
          setSelectedId(myPicksRes.data.pick.castawayId);
          setCurrentPick(myPicksRes.data.pick);
        }

        if (myPicksRes.data.week) {
          setWeekInfo(myPicksRes.data.week);
        }

        if (myPicksRes.data.previousPick) {
          setPreviousPick(myPicksRes.data.previousPick);
        }

        if (myPicksRes.data.suggestedCastaway) {
          setSuggestedCastaway(myPicksRes.data.suggestedCastaway);
        }

        if (allPicksRes.data) {
          setAllPicksData(allPicksRes.data);
          // Default to current week
          if (myPicksRes.data.week?.weekNumber) {
            setSelectedWeek(myPicksRes.data.week.weekNumber);
          }
        }
        setLoading(false);
      } catch (error: unknown) {
        if (!isMounted) return;

        if (isApiError(error) && error.response?.status === 404) {
          setErrorMessage("No active week is available yet.");
          setLoading(false);
          return;
        }
        console.error("Failed to load weekly picks data:", error);
        setErrorMessage("Unable to load weekly picks right now.");
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [selectedLeague]);

  const handleSubmit = async () => {
    if (!selectedId) {
      setErrorMessage("Please select a castaway before submitting.");
      return;
    }

    if (!selectedLeague) {
      setErrorMessage("Please select a league first.");
      return;
    }

    // Check if pick deadline has passed
    if (weekInfo?.picksCloseAt) {
      const deadline = new Date(weekInfo.picksCloseAt);
      const now = new Date();
      if (now > deadline) {
        setErrorMessage("The pick deadline has passed. Picks are now locked.");
        setStatus("error");
        return;
      }
    }

    const headers = { 'x-league-id': selectedLeague.id };

    setStatus("saving");
    setErrorMessage(null);
    try {
      await api.post("/api/picks/me", { castawayId: selectedId }, { headers });
      setStatus("success");

      // Reload all picks data to show updated submission
      const allPicksRes = await api.get("/api/picks/all", { headers });
      if (allPicksRes.data) {
        setAllPicksData(allPicksRes.data);
      }
    } catch (error: unknown) {
      console.error("Failed to save pick:", error);
      setStatus("error");
      setErrorMessage(isApiError(error) ? (error.response?.data?.error ?? "Submission failed. Try again.") : "Submission failed. Try again.");
    }
  };

  const getImagePath = (name: string) => {
    const imageName = name
      .replace("MC Chukwujekwu", 'Michelle MC Chukwujekwu')
      .replace("Annie Davis", 'Kimberly Annie Davis');
    return `/images/${imageName}.webp`;
  };

  const deadline = weekInfo?.picksCloseAt || weekInfo?.lockAt;

  // Helper to check if a user has any active castaways
  const hasActiveCAstaways = (userId: string): boolean => {
    if (!allPicksData) return true;
    const userCastaways = allPicksData.draftPicks
      .filter(dp => dp.userId === userId)
      .map(dp => dp.castawayId);

    if (userCastaways.length === 0) return false;

    return userCastaways.some(castawayId => {
      const castaway = allPicksData.castaways.find(c => c.id === castawayId);
      return castaway && !castaway.eliminated;
    });
  };

  return (
    <main className="rg-page" role="main" aria-label="Weekly Picks">
      <section className="rg-hero" aria-labelledby="picks-title">
        <span className="rg-pill">Weekly Picks</span>
        <h1 id="picks-title">Week {weekInfo?.weekNumber ?? "--"} — {viewMode === "my-picks" ? "Choose your active castaway" : "All Players' Picks"}</h1>
        <p>
          {viewMode === "my-picks"
            ? "Make your selection before the deadline. Only your drafted castaways are eligible, and you can only score points from your active pick."
            : "See who every player picked each week throughout the season."}
        </p>
        <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }} role="tablist" aria-label="Pick view options">
          <button
            onClick={() => setViewMode("my-picks")}
            role="tab"
            aria-selected={viewMode === "my-picks"}
            aria-controls="picks-panel"
            style={{
              background: viewMode === "my-picks" ? "var(--brand-red)" : "#6b7280",
              padding: "0.5rem 1rem",
              fontSize: "0.9rem"
            }}
          >
            My Picks
          </button>
          <button
            onClick={() => setViewMode("all-picks")}
            role="tab"
            aria-selected={viewMode === "all-picks"}
            aria-controls="picks-panel"
            style={{
              background: viewMode === "all-picks" ? "var(--brand-red)" : "#6b7280",
              padding: "0.5rem 1rem",
              fontSize: "0.9rem"
            }}
          >
            All Picks
          </button>
        </div>
        {previousPick && viewMode === "my-picks" && (
          <div className="mt-2" style={{ padding: "1rem", background: "rgba(216, 180, 93, 0.1)", borderRadius: "var(--radius-md)", border: "1px solid var(--accent-gold)" }}>
            <strong>Last Week:</strong> You picked <strong>{previousPick.castaway.name}</strong>
            {previousPick.isAutoSelected && (
              <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>
                (Auto-selected)
              </span>
            )}
          </div>
        )}
        {!currentPick && suggestedCastaway && viewMode === "my-picks" && (
          <div className="mt-2" style={{ padding: "1rem", background: "rgba(34, 197, 94, 0.1)", borderRadius: "var(--radius-md)", border: "1px solid #22c55e" }}>
            <strong>💡 Suggestion:</strong> Based on last week, we recommend picking <strong>{suggestedCastaway.name}</strong> this week.
          </div>
        )}
      </section>

      <section className="rg-section">
        <LeagueSwitcher />
      </section>

      {loading && (
        <section className="rg-section" style={{ textAlign: "center", padding: "3rem" }}>
          <LoadingSpinner size="lg" label="Loading picks..." />
        </section>
      )}

      {!loading && viewMode === "all-picks" && allPicksData ? (
        <section className="rg-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h2>Weekly Picks by Player</h2>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {allPicksData.weeks.map((week) => (
                <button
                  key={week.weekNumber}
                  onClick={() => setSelectedWeek(selectedWeek === week.weekNumber ? null : week.weekNumber)}
                  style={{
                    background: selectedWeek === week.weekNumber ? "var(--brand-red)" : "#6b7280",
                    fontSize: "0.9rem",
                    padding: "0.5rem 1rem"
                  }}
                >
                  Week {week.weekNumber}
                </button>
              ))}
              <button
                onClick={() => setSelectedWeek(null)}
                style={{
                  background: selectedWeek === null ? "var(--brand-red)" : "#6b7280",
                  fontSize: "0.9rem",
                  padding: "0.5rem 1rem"
                }}
              >
                All Weeks
              </button>
            </div>
          </div>
          {allPicksData.weeks.filter(week => selectedWeek === null || week.weekNumber === selectedWeek).map((week) => (
            <div key={week.weekNumber} style={{ marginBottom: "3rem" }}>
              <div
                className="rg-card"
                style={{
                  textAlign: "center",
                  padding: "1.5rem",
                  border: "3px solid var(--brand-red)",
                  background: "#fff",
                  marginBottom: "1.5rem"
                }}
              >
                <h3 style={{ fontSize: "2rem", margin: 0, color: "var(--brand-red)" }}>
                  Week {week.weekNumber}
                </h3>
              </div>

              <div style={{ display: "grid", gap: "2rem" }}>
                {allPicksData.users.map((user) => {
                  const userPick = allPicksData.picks.find(
                    p => p.userId === user.id && p.weekNumber === week.weekNumber
                  );
                  const isEliminated = !hasActiveCAstaways(user.id);

                  return (
                    <div key={user.id} style={{ display: "grid", gap: "1rem" }}>
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
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: "600", fontSize: "1rem" }}>
                            {user.name}
                            {isEliminated && (
                              <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: "#999", fontStyle: "italic" }}>
                                (eliminated)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {userPick && userPick.castaway ? (
                        <div
                          className="rg-card"
                          style={{
                            display: "flex",
                            gap: "1rem",
                            alignItems: "center",
                            opacity: userPick.castaway.eliminated ? 0.4 : 1,
                            filter: userPick.castaway.eliminated ? "grayscale(100%)" : "none"
                          }}
                        >
                          <img
                            src={getImagePath(userPick.castaway.name)}
                            alt={userPick.castaway.name}
                            style={{
                              width: "120px",
                              height: "120px",
                              borderRadius: "8px",
                              objectFit: "cover"
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/placeholder.png";
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: "0 0 0.5rem 0" }}>{userPick.castaway.name}</h3>
                            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "#666" }}>
                              <strong>Tribe:</strong> {userPick.castaway.tribe || "N/A"}
                            </p>
                            {userPick.castaway.hometown && (() => {
                              const parts = userPick.castaway.hometown.split(" → ");
                              const from = parts[0] || "";
                              const livesIn = parts[1] || "";
                              return (
                                <>
                                  {from && (
                                    <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "#666" }}>
                                      <strong>Hometown:</strong> {from}
                                    </p>
                                  )}
                                  {livesIn && (
                                    <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "#666" }}>
                                      <strong>Lives in:</strong> {livesIn}
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="rg-card" style={{ padding: "1.5rem", textAlign: "center", color: "#999" }}>
                          No pick made
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : !loading && (
        <section className="rg-section">
          {deadline && (
            <div className="mb-3">
              <CountdownTimer targetDate={deadline} label="Pick Deadline" />
            </div>
          )}

          {errorMessage && (
            <LoadingError
              resource="weekly picks"
              error={errorMessage}
              onRetry={() => window.location.reload()}
            />
          )}

          {!errorMessage && (
          <>
          <h2 className="mb-2" id="castaways-heading">Your Drafted Castaways</h2>
        <div className="rg-grid rg-grid--two" role="radiogroup" aria-labelledby="castaways-heading">
          {assigned.map((assignment) => {
            const active = selectedId === assignment.castawayId;
            const isSuggested = suggestedCastaway?.id === assignment.castawayId;

            return (
              <article
                key={assignment.castawayId}
                className="rg-card"
                role="radio"
                aria-checked={active}
                aria-label={`Select ${assignment.castaway.name} from ${assignment.castaway.tribe || 'unknown tribe'}, Draft Round ${assignment.round}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(assignment.castawayId);
                  }
                }}
                style={{
                  border: active ? `3px solid var(--brand-red)` : isSuggested ? `2px solid #22c55e` : undefined,
                  cursor: "pointer",
                  position: "relative"
                }}
                onClick={() => setSelectedId(assignment.castawayId)}
              >
                {active && (
                  <div style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    padding: "0.25rem 0.75rem",
                    background: "var(--brand-red)",
                    color: "white",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600
                  }}>
                    SELECTED
                  </div>
                )}
                {isSuggested && !active && (
                  <div style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    padding: "0.25rem 0.75rem",
                    background: "#22c55e",
                    color: "white",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600
                  }}>
                    RECOMMENDED
                  </div>
                )}
                <h3>{assignment.castaway.name}</h3>
                <p className="text-muted mb-2">{assignment.castaway.tribe ?? ""}</p>
                <p>Draft Round {assignment.round}</p>
              </article>
            );
          })}
          {assigned.length === 0 && (
            <p>No draft picks assigned yet. The draft will run as soon as rankings are locked.</p>
          )}
        </div>

        {assigned.length > 0 && (
          <div className="mt-3">
            <button
              onClick={handleSubmit}
              disabled={!selectedId || status === "saving"}
              aria-label={selectedId ? "Submit your pick" : "Select a castaway first"}
              aria-busy={status === "saving"}
            >
              {status === "saving" ? "Submitting..." : "Submit Pick"}
            </button>
            {status === "success" && (
              <p style={{ color: "#22c55e", marginTop: "0.75rem", fontWeight: 600 }}>
                ✓ Pick submitted successfully!
              </p>
            )}
          </div>
        )}

        {assigned.length > 0 && (
          <div className="mt-4" style={{ padding: "1.5rem", background: "rgba(181, 34, 38, 0.05)", borderRadius: "var(--radius-md)", border: "1px solid rgba(181, 34, 38, 0.2)" }}>
            <h3 style={{ marginTop: 0, fontSize: "1rem" }}>⚠️ Important Rules</h3>
            <ul style={{ paddingLeft: "1.5rem", margin: "0.5rem 0 0 0" }}>
              <li>You must make your pick before <strong>Wednesday 7pm EST</strong></li>
              <li>If you miss the deadline, the system will <strong>auto-select the opposite castaway</strong> from last week</li>
              <li>Once the episode airs at 10pm, points are final and cannot be changed</li>
            </ul>
          </div>
        )}
        </>
        )}
        </section>
      )}
    </main>
  );
};

export default WeeklyPicks;
