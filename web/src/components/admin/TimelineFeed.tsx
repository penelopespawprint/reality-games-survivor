import { Link } from 'react-router-dom';

interface TimelineEvent {
  type: 'episode' | 'deadline' | 'job' | 'waiver';
  title: string;
  description: string;
  timestamp: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  actionUrl?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

interface TimelineFeedProps {
  events: TimelineEvent[];
}

const typeColors: Record<string, string> = {
  episode: 'bg-burgundy-500',
  deadline: 'bg-red-500',
  job: 'bg-blue-500',
  waiver: 'bg-green-500',
};

const statusBadges: Record<string, { bg: string; text: string }> = {
  upcoming: { bg: 'bg-neutral-100', text: 'text-neutral-600' },
  'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
};

export function TimelineFeed({ events }: TimelineFeedProps) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-8 text-center">
        <p className="text-neutral-400">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h2 className="text-lg font-display text-neutral-800 mb-6">Upcoming Events</h2>

      <div className="space-y-6">
        {events.slice(0, 10).map((event, index) => (
          <div key={index} className="relative">
            {/* Timeline line */}
            {index < events.length - 1 && index < 9 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-cream-200" />
            )}

            <div className="flex gap-4">
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-12 h-12 ${typeColors[event.type] || 'bg-neutral-400'} rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-md z-10`}
              >
                {event.icon || event.type.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-neutral-800 text-sm">{event.title}</h3>
                  {event.status && (
                    <span
                      className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${statusBadges[event.status]?.bg || 'bg-neutral-100'} ${statusBadges[event.status]?.text || 'text-neutral-600'}`}
                    >
                      {event.status.replace('-', ' ')}
                    </span>
                  )}
                </div>

                <p className="text-sm text-neutral-500 mb-2">{event.description}</p>

                {event.metadata?.timeUntil && (
                  <p className="text-xs text-neutral-400 font-mono mb-2">
                    {event.metadata.timeUntil}
                  </p>
                )}

                {event.actionUrl && (
                  <Link
                    to={event.actionUrl}
                    className="text-xs text-burgundy-600 hover:text-burgundy-700 font-medium inline-flex items-center gap-1"
                  >
                    Take action
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {events.length > 10 && (
        <div className="mt-6 pt-6 border-t border-cream-200 text-center">
          <p className="text-sm text-neutral-400">Showing 10 of {events.length} upcoming events</p>
        </div>
      )}
    </div>
  );
}
