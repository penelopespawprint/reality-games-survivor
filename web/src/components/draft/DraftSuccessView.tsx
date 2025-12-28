/**
 * Draft Success View Component
 *
 * Shows confirmation after rankings are saved.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Trophy } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { getAvatarUrl } from '@/lib/avatar';
import type { Castaway, League } from '@/types';

interface DraftSuccessViewProps {
  leagueId: string;
  league: League | undefined;
  rankings: string[];
  castawayMap: Map<string, Castaway>;
  onEditRankings: () => void;
}

export function DraftSuccessView({
  leagueId,
  league,
  rankings,
  castawayMap,
  onEditRankings,
}: DraftSuccessViewProps) {
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
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-neutral-800">Rankings Saved!</h1>
            <p className="text-neutral-500">{league?.name}</p>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-elevated mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <Check className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Rankings Confirmed!</h2>
              <p className="text-green-100">
                Your draft preferences have been saved for all leagues.
              </p>
            </div>
          </div>
        </div>

        {/* Full Rankings List */}
        <div className="bg-white rounded-2xl shadow-elevated border border-cream-200 overflow-hidden mb-6">
          <div className="p-5 border-b border-cream-100">
            <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-burgundy-500" />
              Your Complete Rankings
            </h2>
            <p className="text-sm text-neutral-500 mt-1">{rankings.length} castaways ranked</p>
          </div>

          <div className="divide-y divide-cream-100 max-h-[60vh] overflow-y-auto">
            {rankings.map((castawayId, index) => {
              const castaway = castawayMap.get(castawayId);
              if (!castaway) return null;

              return (
                <div key={castawayId} className="p-3 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index < 2
                        ? 'bg-burgundy-100 text-burgundy-600'
                        : index < 5
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-cream-100 text-neutral-600'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <img
                    src={getAvatarUrl(castaway.name, castaway.photo_url)}
                    alt={castaway.name}
                    className="w-10 h-10 rounded-full object-cover border border-cream-200"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-800 truncate">{castaway.name}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      {castaway.age && <span>{castaway.age} yrs</span>}
                      {castaway.hometown && (
                        <>
                          {castaway.age && <span>·</span>}
                          <span>{castaway.hometown}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button onClick={onEditRankings} className="flex-1 btn btn-secondary">
            Edit Rankings
          </button>
          <Link to={`/leagues/${leagueId}`} className="flex-1 btn btn-primary text-center">
            Back to League
          </Link>
        </div>
      </div>
    </div>
  );
}
