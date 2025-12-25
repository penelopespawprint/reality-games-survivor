import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChatMessage } from './TribalCouncil';
import { ReactionBar } from './ReactionBar';
import {
  Reply,
  Trash2,
  Pin,
  MoreHorizontal,
  Shield,
  Crown,
} from 'lucide-react';

interface TribalMessageProps {
  message: ChatMessage;
  currentUserId?: string;
  canModerate: boolean;
  onReply: () => void;
  onReaction: (messageId: string, reactionType: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string, isPinned: boolean) => void;
  isCommissioner: boolean;
}

export function TribalMessage({
  message,
  currentUserId,
  canModerate,
  onReply,
  onReaction,
  onDelete,
  onPin,
  isCommissioner,
}: TribalMessageProps) {
  const [showActions, setShowActions] = useState(false);

  const isOwnMessage = message.user_id === currentUserId;
  const isAdmin = message.user?.role === 'admin';

  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: false,
  });

  // Get display name (anonymous or real)
  const displayName = message.is_anonymous
    ? '🗳️ Anonymous Survivor'
    : message.user?.display_name || 'Unknown';

  // Get avatar (anonymous or real)
  const avatarUrl = message.is_anonymous
    ? null
    : message.user?.avatar_url;

  // Get initials for avatar fallback
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Count reactions
  const reactionCounts = Object.entries(message.reactions || {}).reduce(
    (acc, [type, users]) => {
      if (Array.isArray(users) && users.length > 0) {
        acc[type] = users.length;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // Check if current user has reacted
  const userReactions = Object.entries(message.reactions || {}).reduce(
    (acc, [type, users]) => {
      if (Array.isArray(users) && currentUserId && users.includes(currentUserId)) {
        acc[type] = true;
      }
      return acc;
    },
    {} as Record<string, boolean>
  );

  return (
    <div
      className={`tribal-message ${isOwnMessage ? 'own-message' : ''} ${
        message.is_pinned ? 'pinned' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Torch indicator */}
      <div className="torch-indicator">
        <span className="torch-flame">🔥</span>
      </div>

      <div className="message-content-wrapper">
        {/* Header: Avatar + Name + Badge + Time */}
        <div className="message-header">
          <div className="message-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <div className="avatar-fallback">{initials}</div>
            )}
          </div>

          <div className="message-meta">
            <span className="message-author">
              {displayName}
              {isAdmin && (
                <span className="badge admin-badge" title="Admin">
                  <Shield size={12} />
                </span>
              )}
              {isCommissioner && (
                <span className="badge commissioner-badge" title="League Creator">
                  <Crown size={12} />
                </span>
              )}
            </span>
            <span className="message-time">{timeAgo} ago</span>
          </div>

          {/* Action menu */}
          {showActions && (
            <div className="message-actions">
              <button
                className="action-btn"
                onClick={onReply}
                title="Reply"
              >
                <Reply size={14} />
              </button>
              {canModerate && (
                <>
                  <button
                    className="action-btn"
                    onClick={() => onPin(message.id, message.is_pinned)}
                    title={message.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin size={14} />
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => onDelete(message.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Reply context */}
        {message.reply_to && (
          <div className="reply-context">
            <span className="reply-line" />
            <span className="reply-author">
              Replying to {message.reply_to.user?.display_name}
            </span>
            <span className="reply-preview">
              {message.reply_to.content?.slice(0, 50)}
              {message.reply_to.content?.length > 50 ? '...' : ''}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className="message-bubble">
          <p className="message-text">{message.content}</p>

          {/* GIF */}
          {message.gif_url && (
            <div className="message-gif">
              <img src={message.gif_url} alt="GIF" loading="lazy" />
            </div>
          )}
        </div>

        {/* Reactions */}
        <ReactionBar
          reactions={reactionCounts}
          userReactions={userReactions}
          onReaction={(type) => onReaction(message.id, type)}
        />
      </div>
    </div>
  );
}
