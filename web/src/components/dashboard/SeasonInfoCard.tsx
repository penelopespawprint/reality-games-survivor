/**
 * Season Info Card Component
 *
 * Displays current season information and key dates.
 */

import { Play } from 'lucide-react';
import type { Season } from '@/types';
import { formatDate } from '@/lib/date-utils';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

interface SeasonInfoCardProps {
  season: Season;
}

export function SeasonInfoCard({ season }: SeasonInfoCardProps) {
  const { getCopy } = useSiteCopy();

  return (
    <div className="bg-white rounded-2xl p-6 border border-cream-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-burgundy-100 rounded-xl flex items-center justify-center">
          <Play className="h-5 w-5 text-burgundy-500" />
        </div>
        <div>
          <h3 className="font-semibold text-neutral-800">
            <EditableText copyKey="dashboard.season.label" as="span">
              {getCopy('dashboard.season.label', 'Season')}
            </EditableText>{' '}
            {season.number}
          </h3>
          <p className="text-sm text-neutral-400">{season.name}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <EditableText copyKey="dashboard.season.registration_opens" as="span" className="text-neutral-500">
            {getCopy('dashboard.season.registration_opens', 'Registration Opens')}
          </EditableText>
          <span className="text-burgundy-500 font-semibold">
            {formatDate(season.registration_opens_at)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <EditableText copyKey="dashboard.season.premiere" as="span" className="text-neutral-500">
            {getCopy('dashboard.season.premiere', 'Premiere')}
          </EditableText>
          <span className="text-neutral-800 font-semibold">{formatDate(season.premiere_at)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <EditableText copyKey="dashboard.season.draft_deadline" as="span" className="text-neutral-500">
            {getCopy('dashboard.season.draft_deadline', 'Draft Deadline')}
          </EditableText>
          <span className="text-neutral-800 font-semibold">{formatDate(season.draft_deadline)}</span>
        </div>
      </div>
    </div>
  );
}
