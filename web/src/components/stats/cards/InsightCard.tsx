/**
 * Insight Card Component
 *
 * Displays a platform insight or trend without a leaderboard.
 */

import { type ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';

interface InsightCardProps {
  title: string;
  insight: string;
  icon?: ReactNode;
  color?: 'amber' | 'teal' | 'burgundy' | 'neutral';
  children?: ReactNode;
}

export function InsightCard({ title, insight, icon, color = 'amber', children }: InsightCardProps) {
  const colorClasses = {
    amber: {
      bg: 'from-amber-50 to-yellow-50',
      border: 'border-amber-200',
      icon: 'text-amber-500',
      text: 'text-amber-800',
    },
    teal: {
      bg: 'from-teal-50 to-emerald-50',
      border: 'border-teal-200',
      icon: 'text-teal-500',
      text: 'text-teal-800',
    },
    burgundy: {
      bg: 'from-burgundy-50 to-rose-50',
      border: 'border-burgundy-200',
      icon: 'text-burgundy-500',
      text: 'text-burgundy-800',
    },
    neutral: {
      bg: 'from-neutral-50 to-cream-50',
      border: 'border-neutral-200',
      icon: 'text-neutral-500',
      text: 'text-neutral-800',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`bg-gradient-to-br ${colors.bg} rounded-2xl border ${colors.border} p-5`}>
      <div className="flex items-start gap-3">
        <div className={`${colors.icon} shrink-0 mt-0.5`}>
          {icon || <Lightbulb className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${colors.text} mb-1`}>{title}</h3>
          <p className="text-neutral-600 text-sm">{insight}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
