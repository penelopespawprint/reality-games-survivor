/**
 * Pick State Cards Component
 *
 * Full-page states for draft incomplete, no episode, or locked picks.
 */

import { Link } from 'react-router-dom';
import { AlertCircle, Clock, Lock } from 'lucide-react';
import type { Episode, Roster } from '@/types';

interface DraftIncompleteCardProps {
  leagueId: string;
}

export function DraftIncompleteCard({ leagueId }: DraftIncompleteCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-elevated p-12 text-center animate-slide-up">
      <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
        <AlertCircle className="w-10 h-10 text-amber-600" />
      </div>
      <h2 className="text-2xl font-display text-neutral-800 mb-3">Complete Your Draft First</h2>
      <p className="text-neutral-500 mb-8">
        You need to complete the draft before you can make weekly picks. Head to the draft room to
        select your castaways!
      </p>
      <Link to={`/leagues/${leagueId}/draft`} className="btn btn-primary shadow-card">
        Go to Draft Room
      </Link>
    </div>
  );
}

interface NoEpisodeCardProps {
  leagueId: string;
}

export function NoEpisodeCard({ leagueId }: NoEpisodeCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-elevated p-12 text-center animate-slide-up">
      <div className="w-20 h-20 mx-auto mb-6 bg-cream-100 rounded-full flex items-center justify-center">
        <Clock className="w-10 h-10 text-neutral-400" />
      </div>
      <h2 className="text-2xl font-display text-neutral-800 mb-3">No Episode Scheduled</h2>
      <p className="text-neutral-500 mb-8">
        There are no upcoming episodes with open picks. Check back later!
      </p>
      <Link to={`/leagues/${leagueId}`} className="btn btn-primary shadow-card">
        Back to League
      </Link>
    </div>
  );
}

interface LockedPickCardProps {
  leagueId: string;
  episode: Episode;
  roster: Roster[] | undefined;
  currentPickCastawayId: string | null | undefined;
}

export function LockedPickCard({
  leagueId,
  episode,
  roster,
  currentPickCastawayId,
}: LockedPickCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-elevated p-12 text-center animate-slide-up">
      <div className="w-20 h-20 mx-auto mb-6 bg-burgundy-100 rounded-full flex items-center justify-center">
        <Lock className="w-10 h-10 text-burgundy-600" />
      </div>
      <h2 className="text-2xl font-display text-neutral-800 mb-3">Picks Locked</h2>
      <p className="text-neutral-500 mb-2">Your pick for Episode {episode.number} is locked.</p>
      {currentPickCastawayId ? (
        <p className="text-lg font-semibold text-burgundy-600 mb-8">
          {roster?.find((r) => r.castaway_id === currentPickCastawayId)?.castaways?.name ||
            'Unknown'}
        </p>
      ) : (
        <p className="text-lg font-semibold text-orange-600 mb-8">
          No pick submitted - auto-pick will be applied
        </p>
      )}
      <Link to={`/leagues/${leagueId}`} className="btn btn-primary shadow-card">
        Back to League
      </Link>
    </div>
  );
}
