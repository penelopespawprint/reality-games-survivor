/**
 * EmptyState Component
 *
 * Friendly UI for when there's no data to display.
 * Guides users toward taking action rather than showing blank screens.
 */

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="mb-4 text-gray-400" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 max-w-md mb-6">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Pre-built empty states for common scenarios
 */

// Default icons as SVG components
const TrophyIcon = () => (
  <svg
    className="w-16 h-16"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="w-16 h-16"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

const ClipboardIcon = () => (
  <svg
    className="w-16 h-16"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="w-16 h-16"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

export const EmptyLeagues: React.FC<{
  onJoin?: () => void;
  onCreate?: () => void;
}> = ({ onJoin, onCreate }) => (
  <EmptyState
    icon={<UsersIcon />}
    title="No Leagues Yet"
    description="Join an existing league or create your own to start competing with friends and other Survivor fans."
    action={onJoin ? { label: 'Join a League', onClick: onJoin } : undefined}
    secondaryAction={onCreate ? { label: 'Create League', onClick: onCreate } : undefined}
  />
);

export const EmptyPicks: React.FC<{
  onMakePicks?: () => void;
}> = ({ onMakePicks }) => (
  <EmptyState
    icon={<ClipboardIcon />}
    title="No Picks Submitted"
    description="Make your predictions for this week's episode to earn points and climb the leaderboard."
    action={onMakePicks ? { label: 'Make Picks', onClick: onMakePicks } : undefined}
  />
);

export const EmptyLeaderboard: React.FC = () => (
  <EmptyState
    icon={<TrophyIcon />}
    title="Leaderboard Coming Soon"
    description="Once the season starts and picks are scored, you'll see the standings here."
  />
);

export const EmptyResults: React.FC = () => (
  <EmptyState
    icon={<CalendarIcon />}
    title="No Results Yet"
    description="Results will appear here after each episode airs and scores are calculated."
  />
);

export const EmptyDraft: React.FC<{
  onStartDraft?: () => void;
}> = ({ onStartDraft }) => (
  <EmptyState
    icon={<UsersIcon />}
    title="Draft Not Started"
    description="The draft hasn't begun yet. Once it starts, you'll be able to select your castaways."
    action={onStartDraft ? { label: 'Start Draft', onClick: onStartDraft } : undefined}
  />
);

export const EmptySearch: React.FC<{
  query?: string;
  onClear?: () => void;
}> = ({ query, onClear }) => (
  <EmptyState
    title="No Results Found"
    description={
      query
        ? `We couldn't find anything matching "${query}". Try a different search term.`
        : 'Try adjusting your search or filters.'
    }
    action={onClear ? { label: 'Clear Search', onClick: onClear } : undefined}
  />
);

export default EmptyState;
