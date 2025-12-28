import React, { useState } from "react";
import api from "@/lib/api";

interface SurveyPopupProps {
  surveyType: "PRESEASON_RANKING" | "WEEKLY_PICKS" | "LEADERBOARD" | "PROFILE" | "BETA_FEEDBACK";
  question: string;
  onClose: () => void;
  onSubmit: () => void;
}

const SurveyPopup: React.FC<SurveyPopupProps> = ({ surveyType, question, onClose, onSubmit }) => {
  const [answer, setAnswer] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim() && rating === null) return;

    setSubmitting(true);
    try {
      await api.post("/api/feedback", {
        surveyType,
        question,
        answer: answer.trim(),
        rating
      });
      onSubmit();
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
          animation: "fadeIn 0.2s ease-out"
        }}
        onClick={handleSkip}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          borderRadius: "1rem",
          padding: "2rem",
          maxWidth: "500px",
          width: "90%",
          zIndex: 9999,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          animation: "slideUp 0.3s ease-out"
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ff6b35 0%, #d4542a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "1.75rem"
          }}
        >
          💬
        </div>

        {/* Title */}
        <h2
          style={{
            textAlign: "center",
            fontSize: "1.5rem",
            fontWeight: 700,
            marginTop: 0,
            marginBottom: "0.5rem",
            color: "#1a1a1a"
          }}
        >
          Quick Feedback
        </h2>

        {/* Question */}
        <p
          style={{
            textAlign: "center",
            fontSize: "1.125rem",
            color: "#666",
            marginBottom: "1.5rem",
            lineHeight: 1.5
          }}
        >
          {question}
        </p>

        {/* Rating Scale (for some surveys) */}
        {(surveyType === "PRESEASON_RANKING" || surveyType === "LEADERBOARD" || surveyType === "PROFILE") && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem"
              }}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    border: rating === value ? "3px solid var(--brand-red)" : "2px solid #e5e5e5",
                    background: rating === value ? "var(--brand-red)" : "white",
                    color: rating === value ? "white" : "#666",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                color: "#999",
                padding: "0 0.5rem"
              }}
            >
              <span>Very Hard</span>
              <span>Very Easy</span>
            </div>
          </div>
        )}

        {/* Text Input */}
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Share your thoughts... (optional)"
          rows={4}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            border: "2px solid #e5e5e5",
            fontSize: "1rem",
            fontFamily: "inherit",
            resize: "vertical",
            marginBottom: "1.5rem"
          }}
        />

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleSkip}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "0.875rem 1.5rem",
              borderRadius: "0.5rem",
              border: "2px solid #e5e5e5",
              background: "white",
              color: "#666",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
              transition: "all 0.2s"
            }}
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (!answer.trim() && rating === null)}
            style={{
              flex: 1,
              padding: "0.875rem 1.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "linear-gradient(135deg, #ff6b35 0%, #d4542a 100%)",
              color: "white",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: (submitting || (!answer.trim() && rating === null)) ? "not-allowed" : "pointer",
              opacity: (submitting || (!answer.trim() && rating === null)) ? 0.6 : 1,
              transition: "all 0.2s"
            }}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
};

export default SurveyPopup;
