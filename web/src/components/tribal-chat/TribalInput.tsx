import { useState, useRef, useEffect } from 'react';
import { Send, Image, X, EyeOff, Eye, Smile } from 'lucide-react';
import { ChatMessage } from './TribalCouncil';
import { GifPicker } from './GifPicker';

interface TribalInputProps {
  onSend: (content: string, gifUrl?: string) => void;
  onTyping: () => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  votingBoothMode: boolean;
  onToggleVotingBooth: () => void;
  disabled?: boolean;
}

export function TribalInput({
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  votingBoothMode,
  onToggleVotingBooth,
  disabled = false,
}: TribalInputProps) {
  const [content, setContent] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (content.trim() || showGifPicker) {
      onSend(content.trim());
      setContent('');
      setShowGifPicker(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    onSend('', gifUrl);
    setShowGifPicker(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping();
  };

  return (
    <div className="tribal-input-container">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="reply-indicator">
          <span className="reply-to-label">
            Replying to <strong>{replyingTo.user?.display_name}</strong>
          </span>
          <button className="cancel-reply" onClick={onCancelReply}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Voting booth mode indicator */}
      {votingBoothMode && (
        <div className="voting-booth-indicator">
          <EyeOff size={14} />
          <span>Voting Booth Mode: Your message will be anonymous</span>
        </div>
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {/* Input area */}
      <form className="tribal-input" onSubmit={handleSubmit}>
        <div className="input-wood-border">
          <span className="wood-emoji">🪵</span>

          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                disabled
                  ? 'Sign in to speak at Tribal Council...'
                  : 'Speak your truth, survivor...'
              }
              disabled={disabled}
              rows={1}
            />

            <div className="input-actions">
              {/* Anonymous toggle */}
              <button
                type="button"
                className={`input-action-btn ${votingBoothMode ? 'active' : ''}`}
                onClick={onToggleVotingBooth}
                title={votingBoothMode ? 'Exit Voting Booth' : 'Voting Booth (Anonymous)'}
                disabled={disabled}
              >
                {votingBoothMode ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>

              {/* GIF button */}
              <button
                type="button"
                className={`input-action-btn ${showGifPicker ? 'active' : ''}`}
                onClick={() => setShowGifPicker(!showGifPicker)}
                title="Add GIF"
                disabled={disabled}
              >
                <Image size={18} />
              </button>

              {/* Send button */}
              <button
                type="submit"
                className="send-btn"
                disabled={disabled || (!content.trim())}
                title="Send"
              >
                <span className="send-flame">🔥</span>
                <span className="send-text">SEND</span>
              </button>
            </div>
          </div>

          <span className="wood-emoji">🪵</span>
        </div>
      </form>
    </div>
  );
}
