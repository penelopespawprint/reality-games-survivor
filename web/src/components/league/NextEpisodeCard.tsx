/**
 * Next Episode Card Component
 *
 * Shows countdown to the next episode.
 */

import { Clock } from 'lucide-react';
import type { Episode } from '@/types';

interface NextEpisodeCardProps {
  episode: Episode;
}

export function NextEpisodeCard({ episode }: NextEpisodeCardProps) {
  return (
    <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-5 text-white shadow-elevated">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-burgundy-200" />
          <div>
            <p className="text-burgundy-100 text-sm">Next Episode</p>
            <p className="font-semibold text-lg">Episode {episode.number}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-burgundy-100 text-sm">Airs</p>
          <p className="font-semibold">
            {new Date(episode.air_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
