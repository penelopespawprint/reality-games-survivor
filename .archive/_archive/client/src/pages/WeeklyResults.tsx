import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { WeeklyResult } from "../shared/types";

const WeeklyResults: React.FC = () => {
  const [results, setResults] = useState<WeeklyResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/results")
      .then((res) => {
        setResults(res.data);
        setError(null);
      })
      .catch(() => {
        setResults([]);
        setError("Unable to load weekly results.");
      });
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<number, WeeklyResult[]>();
    for (const result of results) {
      const list = map.get(result.weekNumber) ?? [];
      list.push(result);
      map.set(result.weekNumber, list);
    }
    const sortedWeeks = Array.from(map.keys()).sort((a, b) => b - a);
    return { map, sortedWeeks };
  }, [results]);

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    if (grouped.sortedWeeks.length > 0 && !selectedWeek) {
      setSelectedWeek(grouped.sortedWeeks[0]);
    }
  }, [grouped, selectedWeek]);

  const weekResults = selectedWeek ? grouped.map.get(selectedWeek) ?? [] : [];

  return (
    <main role="main" aria-label="Weekly Results" className="rg-page">
      <section className="rg-hero">
        <span className="rg-pill">Weekly Results</span>
        <h1>Week {selectedWeek ?? "--"} scoreboard</h1>
        <p>
          See how active selections performed this week. Scores update minutes after the episode airs, so you can watch
          the leaderboard shuffle in real time.
        </p>
      </section>

      <section className="rg-section" style={{ marginTop: "3rem" }}>
        {error && <p className="error" role="alert">{error}</p>}

        {grouped.sortedWeeks.length > 0 && (
          <div className="rg-tabs" role="tablist" aria-label="Select week">
            {grouped.sortedWeeks.map((week) => (
              <button
                key={week}
                type="button"
                role="tab"
                aria-selected={selectedWeek === week}
                className={`rg-tab ${selectedWeek === week ? "active" : ""}`}
                onClick={() => setSelectedWeek(week)}
              >
                Week {week}
              </button>
            ))}
          </div>
        )}

        {weekResults.length === 0 && !error ? (
          <p>No results posted yet.</p>
        ) : null}

        {weekResults.length > 0 && (
          <table role="table" aria-label={`Week ${selectedWeek} results`}>
            <thead>
              <tr>
                <th scope="col">Castaway</th>
                <th scope="col">Tribe</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              {weekResults
                .slice()
                .sort((a, b) => b.points - a.points)
                .map((result) => (
                  <tr key={result.id}>
                    <td>{result.castaway.name}</td>
                    <td>{result.castaway.tribe}</td>
                    <td>{result.points}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
};

export default WeeklyResults;
