/**
 * Weekly Timeline Card Component
 *
 * Displays the weekly schedule timeline.
 */

import { Calendar } from 'lucide-react';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

export function WeeklyTimelineCard() {
  const { getCopy } = useSiteCopy();

  return (
    <div className="bg-white rounded-2xl p-6 border border-cream-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Calendar className="h-5 w-5 text-amber-600" />
        </div>
        <EditableText copyKey="dashboard.timeline.title" as="h3" className="font-semibold text-neutral-800">
          {getCopy('dashboard.timeline.title', 'Weekly Timeline')}
        </EditableText>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-burgundy-500 mt-2 flex-shrink-0" />
          <div>
            <EditableText copyKey="dashboard.timeline.picks_lock_time" as="p" className="text-sm font-medium text-neutral-800">
              {getCopy('dashboard.timeline.picks_lock_time', 'Wednesday 8pm ET / 5pm PT')}
            </EditableText>
            <EditableText copyKey="dashboard.timeline.picks_lock_desc" as="p" className="text-xs text-neutral-500">
              {getCopy('dashboard.timeline.picks_lock_desc', 'Picks lock & episode airs on CBS')}
            </EditableText>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
          <div>
            <EditableText copyKey="dashboard.timeline.results_time" as="p" className="text-sm font-medium text-neutral-800">
              {getCopy('dashboard.timeline.results_time', 'Wednesday ~9pm PT')}
            </EditableText>
            <EditableText copyKey="dashboard.timeline.results_desc" as="p" className="text-xs text-neutral-500">
              {getCopy('dashboard.timeline.results_desc', 'Results posted (exceptions may apply)')}
            </EditableText>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
          <div>
            <EditableText copyKey="dashboard.timeline.picks_open_time" as="p" className="text-sm font-medium text-neutral-800">
              {getCopy('dashboard.timeline.picks_open_time', 'Friday 11am ET / 8am PT')}
            </EditableText>
            <EditableText copyKey="dashboard.timeline.picks_open_desc" as="p" className="text-xs text-neutral-500">
              {getCopy('dashboard.timeline.picks_open_desc', 'Weekly picks open for next episode')}
            </EditableText>
          </div>
        </div>
      </div>
    </div>
  );
}
