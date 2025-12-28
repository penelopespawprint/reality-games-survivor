/**
 * Quick Actions Grid Component
 *
 * Displays primary CTA and secondary action cards based on game phase.
 */

import { Link } from 'react-router-dom';
import { ListChecks, Target, Trophy, BookOpen, Flame, ChevronRight, Clock } from 'lucide-react';
import type { GamePhase, Season, Episode } from '@/types';
import { getCountdownText } from '@/lib/date-utils';

interface QuickActionsGridProps {
  gamePhase: GamePhase;
  activeSeason: Season | null;
  nextEpisode: Episode | null;
  primaryLeagueId?: string;
  castawayCount: number;
}

export function QuickActionsGrid({
  gamePhase,
  activeSeason,
  nextEpisode,
  primaryLeagueId,
  castawayCount,
}: QuickActionsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Primary CTA based on phase */}
      {gamePhase === 'pre_draft' || gamePhase === 'pre_registration' ? (
        <Link
          to="/draft/rankings"
          className="col-span-2 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-2xl p-6 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <ListChecks className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl">Set Your Draft Rankings</h3>
              <p className="text-burgundy-100 text-sm mt-1">Rank all 24 castaways before the draft</p>
            </div>
            <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
          </div>
          {activeSeason && (
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
              <Clock className="h-4 w-4 text-burgundy-200" />
              <span className="text-sm text-burgundy-100">
                Premiere in {getCountdownText(new Date(activeSeason.premiere_at))}
              </span>
            </div>
          )}
        </Link>
      ) : gamePhase === 'active' && nextEpisode ? (
        <Link
          to={primaryLeagueId ? `/leagues/${primaryLeagueId}/pick` : '/leagues'}
          className="col-span-2 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-2xl p-6 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Target className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl">Make Your Pick</h3>
              <p className="text-burgundy-100 text-sm mt-1">
                Episode {nextEpisode.number} — Lock in before Wednesday
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
            <Clock className="h-4 w-4 text-burgundy-200" />
            <span className="text-sm text-burgundy-100">
              Picks lock in {getCountdownText(new Date(nextEpisode.picks_lock_at))}
            </span>
          </div>
        </Link>
      ) : (
        <Link
          to="/leaderboard"
          className="col-span-2 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-2xl p-6 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl">View Final Standings</h3>
              <p className="text-burgundy-100 text-sm mt-1">
                {activeSeason ? `Season ${activeSeason.number} results are in!` : 'Results are in!'}
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* Scoring Rules */}
      <Link
        to="/scoring"
        className="bg-white hover:bg-cream-50 border-2 border-cream-200 hover:border-burgundy-300 rounded-2xl p-5 transition-all group"
      >
        <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-burgundy-500 transition-colors">
          <BookOpen className="h-6 w-6 text-burgundy-500 group-hover:text-white transition-colors" />
        </div>
        <h3 className="font-bold text-neutral-800">Scoring Rules</h3>
        <p className="text-neutral-500 text-sm mt-1">See how you score</p>
      </Link>

      {/* View Castaways */}
      <Link
        to="/castaways"
        className="bg-white hover:bg-cream-50 border-2 border-cream-200 hover:border-burgundy-300 rounded-2xl p-5 transition-all group"
      >
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-500 transition-colors">
          <Flame className="h-6 w-6 text-orange-500 group-hover:text-white transition-colors" />
        </div>
        <h3 className="font-bold text-neutral-800">{castawayCount || 24} Castaways</h3>
        <p className="text-neutral-500 text-sm mt-1">Meet the players</p>
      </Link>
    </div>
  );
}
