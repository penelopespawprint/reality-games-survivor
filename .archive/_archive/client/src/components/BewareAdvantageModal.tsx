import React, { useEffect, useState } from "react";
import "./BewareAdvantageModal.css";

interface BewareAdvantageModalProps {
  onClose: () => void;
}

const BewareAdvantageModal: React.FC<BewareAdvantageModalProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleAccept = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`beware-modal-overlay ${isVisible ? "visible" : ""}`}>
      <div className={`beware-modal-content ${isVisible ? "visible" : ""}`}>
        <div className="parchment">
          <div className="parchment-header">
            <h2>🔥 BEWARE ADVANTAGE 🔥</h2>
            <p className="subtitle">You have discovered the power of knowledge</p>
          </div>

          <div className="parchment-body">
            <p style={{ marginBottom: "0.75rem", fontSize: "0.85rem" }}>
              Welcome to the Reality Games Fantasy League!
            </p>

            <div className="deadline-section">
              <h4>⏰ Key Deadlines</h4>
              <ul>
                <li><strong>Rankings:</strong> Wed, Oct 8 Noon PT</li>
                <li><strong>Draft:</strong> Wed, 12:00 PM PT</li>
                <li><strong>Weekly Picks:</strong> Wed, 5:00 PM PT</li>
              </ul>
            </div>

            <div className="tasks-section">
              <h4>📋 Weekly Tasks</h4>
              <ul>
                <li>Save Your Castaway Rankings</li>
                <li>Select Your Weekly Pick</li>
                <li>Check Leaderboards</li>
              </ul>
            </div>
          </div>

          <button className="accept-button" onClick={handleAccept}>
            Accept the Advantage
          </button>
        </div>
      </div>
    </div>
  );
};

export default BewareAdvantageModal;
