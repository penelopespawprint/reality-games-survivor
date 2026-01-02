/**
 * Weekly Timeline Card Component
 *
 * Displays the weekly schedule timeline.
 */

import { Calendar } from 'lucide-react';

export function WeeklyTimelineCard() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-cream-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Calendar className="h-5 w-5 text-amber-600" />
        </div>
        <h3 className="font-semibold text-neutral-800">Weekly Timeline</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-burgundy-500 mt-2 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-neutral-800">Wednesday 8pm ET / 5pm PT</p>
            <p className="text-xs text-neutral-500">Picks lock & episode airs on CBS</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-neutral-800">Wednesday ~9pm PT</p>
            <p className="text-xs text-neutral-500">Results posted after West Coast airing</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-neutral-800">Thursday Morning</p>
            <p className="text-xs text-neutral-500">Scoring finalized</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-neutral-800">Thursday</p>
            <p className="text-xs text-neutral-500">Next week's picks open</p>
          </div>
        </div>
      </div>
    </div>
  );
}
