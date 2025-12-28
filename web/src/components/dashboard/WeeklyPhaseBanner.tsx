/**
 * Weekly Phase Banner Component
 *
 * Displays the current weekly phase with countdown and CTA.
 */

import { Link } from 'react-router-dom';
import type { WeeklyPhaseInfo } from '@/types';
import { getCountdownText } from '@/lib/date-utils';

interface WeeklyPhaseBannerProps {
  weeklyPhase: WeeklyPhaseInfo;
  primaryLeagueId?: string;
}

const colorClasses = {
  burgundy: {
    bg: 'bg-gradient-to-r from-burgundy-500 to-burgundy-600',
    btn: 'bg-white text-burgundy-600 hover:bg-cream-100',
  },
  orange: {
    bg: 'bg-gradient-to-r from-orange-500 to-orange-600',
    btn: 'bg-white text-orange-600 hover:bg-cream-100',
  },
  amber: {
    bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
    btn: 'bg-white text-amber-600 hover:bg-cream-100',
  },
  green: {
    bg: 'bg-gradient-to-r from-green-500 to-green-600',
    btn: 'bg-white text-green-600 hover:bg-cream-100',
  },
  blue: {
    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    btn: 'bg-white text-blue-600 hover:bg-cream-100',
  },
};

const pulseClasses = {
  make_pick: 'bg-white animate-pulse',
  picks_locked: 'bg-white/80',
  awaiting_results: 'bg-white/60',
  results_posted: 'bg-white/60',
};

export function WeeklyPhaseBanner({ weeklyPhase, primaryLeagueId }: WeeklyPhaseBannerProps) {
  const colors = colorClasses[weeklyPhase.color];

  return (
    <div className={`rounded-2xl p-6 mb-8 ${colors.bg} text-white`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full ${pulseClasses[weeklyPhase.phase]}`} />
            <span className="text-sm font-semibold opacity-90 uppercase tracking-wide">
              {weeklyPhase.label}
            </span>
          </div>
          <p className="text-lg font-medium">{weeklyPhase.description}</p>
          {weeklyPhase.countdown && (
            <p className="text-sm opacity-80 mt-1">
              {weeklyPhase.countdown.label}: {getCountdownText(weeklyPhase.countdown.targetTime)}
            </p>
          )}
        </div>
        {primaryLeagueId && (
          <Link
            to={`/leagues/${primaryLeagueId}${weeklyPhase.ctaPath}`}
            className={`btn ${colors.btn} font-semibold`}
          >
            {weeklyPhase.ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
