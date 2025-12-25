import { OnlineUser } from './TribalCouncil';

interface OnlineUsersProps {
  users: OnlineUser[];
}

export function OnlineUsers({ users }: OnlineUsersProps) {
  if (users.length === 0) return null;

  return (
    <div className="online-users-sidebar">
      <div className="online-header">
        <span className="torch-lit">🔥</span>
        <span>Torches Lit ({users.length})</span>
      </div>

      <div className="online-list">
        {users.map((user) => (
          <div key={user.user_id} className="online-user">
            <div className="online-avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.display_name} />
              ) : (
                <div className="avatar-fallback">
                  {user.display_name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="online-indicator" />
            </div>

            <div className="online-info">
              <span className="online-name">{user.display_name}</span>
              {user.is_typing && (
                <span className="typing-indicator">typing...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
