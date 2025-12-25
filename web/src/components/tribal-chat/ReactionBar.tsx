import { useState } from 'react';
import { Plus } from 'lucide-react';

const REACTION_TYPES = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'snake', emoji: '🐍', label: 'Snake' },
  { type: 'vote', emoji: '🗳️', label: 'Vote' },
  { type: 'blindside', emoji: '💀', label: 'Blindside' },
  { type: 'idol', emoji: '🏝️', label: 'Idol' },
  { type: 'crown', emoji: '👑', label: 'Crown' },
] as const;

interface ReactionBarProps {
  reactions: Record<string, number>;
  userReactions: Record<string, boolean>;
  onReaction: (type: string) => void;
}

export function ReactionBar({
  reactions,
  userReactions,
  onReaction,
}: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);

  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div className="reaction-bar">
      {/* Existing reactions */}
      {REACTION_TYPES.map(({ type, emoji, label }) => {
        const count = reactions[type] || 0;
        const hasReacted = userReactions[type] || false;

        if (count === 0 && !showPicker) return null;

        return (
          <button
            key={type}
            className={`reaction-btn ${hasReacted ? 'reacted' : ''}`}
            onClick={() => onReaction(type)}
            title={label}
          >
            <span className="reaction-emoji">{emoji}</span>
            {count > 0 && <span className="reaction-count">{count}</span>}
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="reaction-picker-container">
        <button
          className="add-reaction-btn"
          onClick={() => setShowPicker(!showPicker)}
          title="Add reaction"
        >
          <Plus size={14} />
        </button>

        {/* Reaction picker dropdown */}
        {showPicker && (
          <div className="reaction-picker">
            {REACTION_TYPES.map(({ type, emoji, label }) => (
              <button
                key={type}
                className="picker-reaction"
                onClick={() => {
                  onReaction(type);
                  setShowPicker(false);
                }}
                title={label}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
