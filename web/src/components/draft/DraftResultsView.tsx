/**
 * Draft Results View Component
 *
 * Shows the user's drafted roster after draft completes.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Users } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { getAvatarUrl } from '@/lib/avatar';
import type { League, Roster } from '@/types';

interface DraftResultsViewProps {
  leagueId: string;
  league: League | undefined;
  roster: Roster[];
}

export function DraftResultsView({ leagueId, league, roster }: DraftResultsViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />

      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/leagues/${leagueId}`}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800">Draft Results</h1>
            <p className="text-neutral-500">{league?.name}</p>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-elevated mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Draft Complete!</h2>
              <p className="text-green-100">Your team has been drafted based on your rankings.</p>
            </div>
          </div>
        </div>

        {/* Your Team */}
        <div className="bg-white rounded-2xl shadow-elevated border border-cream-200 overflow-hidden">
          <div className="p-5 border-b border-cream-100">
            <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-burgundy-500" />
              Your Team
            </h2>
          </div>

          <div className="divide-y divide-cream-100">
            {roster.map((rosterEntry, index) => (
              <div key={rosterEntry.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-burgundy-100 rounded-full flex items-center justify-center">
                  <span className="font-bold text-burgundy-600">#{index + 1}</span>
                </div>
                <img
                  src={getAvatarUrl(
                    rosterEntry.castaways?.name || 'Unknown',
                    rosterEntry.castaways?.photo_url
                  )}
                  alt={rosterEntry.castaways?.name || 'Castaway'}
                  className="w-14 h-14 rounded-full object-cover border-2 border-cream-200"
                />
                <div className="flex-1">
                  <p className="font-semibold text-neutral-800">{rosterEntry.castaways?.name}</p>
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    {rosterEntry.castaways?.age && <span>{rosterEntry.castaways.age} yrs</span>}
                    {rosterEntry.castaways?.hometown && (
                      <>
                        {rosterEntry.castaways?.age && <span>·</span>}
                        <span>{rosterEntry.castaways.hometown}</span>
                      </>
                    )}
                    {rosterEntry.castaways?.occupation && (
                      <>
                        <span>·</span>
                        <span>{rosterEntry.castaways.occupation}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-400">Round {rosterEntry.draft_round}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to={`/leagues/${leagueId}`} className="btn btn-primary">
            Back to League
          </Link>
        </div>
      </div>
    </div>
  );
}
