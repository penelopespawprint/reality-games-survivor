interface ActivityItem {
  type:
    | 'user_signup'
    | 'league_created'
    | 'draft_completed'
    | 'pick_submitted'
    | 'payment_received'
    | 'admin_action';
  message: string;
  user?: {
    id: string;
    display_name: string;
  };
  timestamp: string;
  icon: string;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const typeColors: Record<string, string> = {
  user_signup: 'bg-blue-100 text-blue-600',
  league_created: 'bg-purple-100 text-purple-600',
  draft_completed: 'bg-green-100 text-green-600',
  pick_submitted: 'bg-yellow-100 text-yellow-600',
  payment_received: 'bg-green-100 text-green-600',
  admin_action: 'bg-burgundy-100 text-burgundy-600',
};

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-8 text-center">
        <p className="text-neutral-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h2 className="text-lg font-display text-neutral-800 mb-6">Recent Activity</h2>

      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-cream-50 transition-colors"
          >
            {/* Icon */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${typeColors[activity.type] || 'bg-neutral-100 text-neutral-600'}`}
            >
              {activity.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-neutral-700">{activity.message}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
