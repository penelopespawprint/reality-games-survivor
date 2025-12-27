import { Link } from 'react-router-dom';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    jobs: boolean;
    emailQueue: boolean;
  };
  lastCheckTime: string;
  issues: string[];
}

interface SystemHealthBannerProps {
  health: SystemHealth;
}

const statusConfig = {
  healthy: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-500',
    badge: 'bg-green-500',
    label: 'All Systems Operational',
  },
  degraded: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-500',
    badge: 'bg-yellow-500',
    label: 'Some Issues Detected',
  },
  unhealthy: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500',
    badge: 'bg-red-500',
    label: 'Critical Issues',
  },
};

export function SystemHealthBanner({ health }: SystemHealthBannerProps) {
  const config = statusConfig[health.status];
  const lastCheck = new Date(health.lastCheckTime);
  const timeAgo = Math.floor((Date.now() - lastCheck.getTime()) / 1000 / 60);

  return (
    <div className={`${config.bg} ${config.border} border rounded-2xl p-4 mb-8 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className={`w-3 h-3 ${config.badge} rounded-full animate-pulse`} />

          {/* Status text */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${config.text}`}>{config.label}</h3>
              {health.issues.length > 0 && (
                <span className={`text-xs ${config.text} opacity-70`}>
                  ({health.issues.length} {health.issues.length === 1 ? 'issue' : 'issues'})
                </span>
              )}
            </div>
            <p className={`text-sm ${config.text} opacity-70 mt-0.5`}>
              Last checked {timeAgo < 1 ? 'just now' : `${timeAgo}m ago`}
            </p>
          </div>

          {/* Check indicators */}
          <div className="flex gap-2 ml-4">
            <CheckIndicator label="DB" healthy={health.checks.database} />
            <CheckIndicator label="Jobs" healthy={health.checks.jobs} />
            <CheckIndicator label="Email" healthy={health.checks.emailQueue} />
          </div>
        </div>

        {/* View details link */}
        <Link
          to="/admin/jobs"
          className={`text-sm ${config.text} font-medium hover:underline flex items-center gap-1`}
        >
          View Details
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Issues list */}
      {health.issues.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current opacity-20">
          <ul className={`text-sm ${config.text} space-y-1`}>
            {health.issues.slice(0, 3).map((issue, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="text-xs">•</span>
                {issue}
              </li>
            ))}
            {health.issues.length > 3 && (
              <li className="text-xs opacity-70">+{health.issues.length - 3} more issues</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function CheckIndicator({ label, healthy }: { label: string; healthy: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
        healthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
