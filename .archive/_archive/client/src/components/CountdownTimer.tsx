import React, { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date | string;
  label?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, label = "Time remaining" }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        borderRadius: "var(--radius-md)",
        background: isExpired ? "rgba(239, 68, 68, 0.1)" : "rgba(216, 180, 93, 0.1)",
        border: `2px solid ${isExpired ? "#ef4444" : "var(--accent-gold)"}`,
        textAlign: "center"
      }}
    >
      <div style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700, color: isExpired ? "#ef4444" : "var(--text-dark)", marginTop: "0.25rem" }}>
        {timeLeft}
      </div>
    </div>
  );
};

export default CountdownTimer;
