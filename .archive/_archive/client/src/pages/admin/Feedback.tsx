import React, { useState, useEffect } from "react";
import api from "@/lib/api";

interface FeedbackItem {
  id: string;
  surveyType: string;
  question: string;
  answer: string;
  rating: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string | null;
  };
}

interface FeedbackStats {
  totalResponses: number;
  byType: Array<{
    surveyType: string;
    _count: { id: number };
    _avg: { rating: number | null };
  }>;
}

const Feedback: React.FC = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
    fetchStats();
  }, [selectedType]);

  const fetchFeedback = async () => {
    try {
      const query = selectedType !== "ALL" ? `?surveyType=${selectedType}` : "";
      const response = await api.get(`/api/feedback${query}`);
      setFeedback(response.data);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/api/feedback/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const surveyTypes = [
    { value: "ALL", label: "All Surveys" },
    { value: "PRESEASON_RANKING", label: "Preseason Ranking" },
    { value: "WEEKLY_PICKS", label: "Weekly Picks" },
    { value: "LEADERBOARD", label: "Leaderboard" },
    { value: "PROFILE", label: "Profile" },
    { value: "BETA_FEEDBACK", label: "Beta Feedback" }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const getSurveyTypeLabel = (type: string) => {
    return surveyTypes.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return <div className="rg-page">Loading feedback...</div>;
  }

  return (
    <main role="main" aria-label="User Feedback" className="rg-page">
      <section className="rg-hero" aria-labelledby="feedback-title">
        <span className="rg-pill">Admin</span>
        <h1 id="feedback-title">User Feedback</h1>
        <p>View and analyze user survey responses to improve the platform.</p>
      </section>

      {/* Stats Cards */}
      {stats && (
        <section className="rg-section">
          <h2>Response Statistics</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginTop: "1rem"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #ff6b35 0%, #d4542a 100%)",
              color: "white",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 700 }}>{stats.totalResponses}</div>
              <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>Total Responses</div>
            </div>
            {stats.byType.map((stat) => (
              <div key={stat.surveyType} style={{
                background: "white",
                border: "2px solid #e5e5e5",
                padding: "1.5rem",
                borderRadius: "0.75rem"
              }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--brand-red)" }}>
                  {stat._count.id}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
                  {getSurveyTypeLabel(stat.surveyType)}
                </div>
                {stat._avg.rating && (
                  <div style={{ fontSize: "0.85rem", color: "#999" }}>
                    Avg: {stat._avg.rating.toFixed(1)}/5
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter */}
      <section className="rg-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2>Responses</h2>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "2px solid #e5e5e5",
              fontSize: "1rem"
            }}
          >
            {surveyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback List */}
        {feedback.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", padding: "3rem" }}>
            No feedback responses yet.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {feedback.map((item) => (
              <div key={item.id} style={{
                background: "white",
                border: "2px solid #e5e5e5",
                borderRadius: "0.75rem",
                padding: "1.5rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                  <div>
                    <span style={{
                      display: "inline-block",
                      background: "#f3f4f6",
                      color: "#666",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>
                      {getSurveyTypeLabel(item.surveyType)}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, color: "#333" }}>{item.user.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "#999" }}>{formatDate(item.createdAt)}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontWeight: 600, color: "#666", marginBottom: "0.5rem" }}>
                    {item.question}
                  </div>
                  {item.rating && (
                    <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} style={{
                          fontSize: "1.25rem",
                          color: star <= item.rating! ? "#ff6b35" : "#e5e5e5"
                        }}>
                          ★
                        </span>
                      ))}
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.9rem", color: "#666" }}>
                        {item.rating}/5
                      </span>
                    </div>
                  )}
                  {item.answer && (
                    <div style={{
                      background: "#f9f9f9",
                      padding: "1rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #e5e5e5"
                    }}>
                      <div style={{ fontSize: "0.95rem", color: "#333", lineHeight: 1.6 }}>
                        "{item.answer}"
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: "0.85rem", color: "#999" }}>
                  Response from: {item.user.email}
                  {item.user.username && ` (@${item.user.username})`}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Feedback;
