import React, { useState, useEffect } from "react";

const ReminderBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check localStorage to see if user has dismissed the reminder
    const isDismissed = localStorage.getItem('reminderBarDismissed');
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('reminderBarDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #ff6b35 0%, #d4542a 100%)",
      color: "white",
      padding: "0.75rem 3rem 0.75rem 1rem",
      textAlign: "center",
      fontSize: "0.95rem",
      fontWeight: 500,
      position: "relative",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      zIndex: 50
    }}>
      <span style={{ display: "inline-block", maxWidth: "100%" }}>
        <span style={{ display: "inline" }}>📱 </span>
        <strong>Text SURVIVOR to 918-213-3311</strong>
        <span style={{ display: "inline" }}> for weekly reminders and league stats.</span>
      </span>
      <button
        onClick={handleDismiss}
        style={{
          position: "absolute",
          right: "0.5rem",
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          color: "white",
          fontSize: "1.5rem",
          cursor: "pointer",
          padding: "0.25rem 0.5rem",
          lineHeight: 1,
          opacity: 0.8,
          transition: "opacity 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.8"}
        aria-label="Close reminder"
      >
        ×
      </button>
      <style>{`
        @media (max-width: 768px) {
          div[style*="padding: 0.75rem"] {
            padding: 0.65rem 2.5rem 0.65rem 0.75rem !important;
            font-size: 0.85rem !important;
          }
        }
        @media (max-width: 480px) {
          div[style*="padding: 0.75rem"] {
            padding: 0.6rem 2.5rem 0.6rem 0.65rem !important;
            font-size: 0.8rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReminderBar;
