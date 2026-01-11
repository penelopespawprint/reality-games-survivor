/**
 * Quick Actions Grid Component
 *
 * Displays primary CTA and secondary action cards based on game phase.
 */

import { Link } from 'react-router-dom';
import { ListChecks, Target, Trophy, BookOpen, Flame, ChevronRight, Clock } from 'lucide-react';
import type { GamePhase, Season, Episode } from '@/types';
import { getCountdownText } from '@/lib/date-utils';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

interface QuickActionsGridProps {
  gamePhase: GamePhase;
  activeSeason: Season | null;
  nextEpisode: Episode | null;
  primaryLeagueId?: string;
  castawayCount: number;
  hasPickedForNextEpisode?: boolean;
}

export function QuickActionsGrid({
  gamePhase,
  activeSeason,
  nextEpisode,
  primaryLeagueId,
  castawayCount,
  hasPickedForNextEpisode = false,
}: QuickActionsGridProps) {
  const { getCopy } = useSiteCopy();

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
              <EditableText copyKey="dashboard.cta.draft_rankings_title" as="h3" className="font-bold text-xl">
                {getCopy('dashboard.cta.draft_rankings_title', 'Set Your Draft Rankings')}
              </EditableText>
              <p className="text-burgundy-100 text-sm mt-1">
                <EditableText copyKey="dashboard.cta.draft_rankings_desc" as="span" className="text-burgundy-100 text-sm">
                  {getCopy('dashboard.cta.draft_rankings_desc', 'Rank')}
                </EditableText>{' '}
                {castawayCount > 0 ? `all ${castawayCount}` : 'the'}{' '}
                <EditableText copyKey="dashboard.cta.castaways_before_draft" as="span" className="text-burgundy-100 text-sm">
                  {getCopy('dashboard.cta.castaways_before_draft', 'castaways before the draft')}
                </EditableText>
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
          </div>
          {activeSeason && (
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
              <Clock className="h-4 w-4 text-burgundy-200" />
              <span className="text-sm text-burgundy-100">
                <EditableText copyKey="dashboard.cta.premiere_in" as="span" className="text-sm text-burgundy-100">
                  {getCopy('dashboard.cta.premiere_in', 'Premiere in')}
                </EditableText>{' '}
                {getCountdownText(new Date(activeSeason.premiere_at))}
              </span>
            </div>
          )}
        </Link>
      ) : gamePhase === 'active' && nextEpisode ? (
        hasPickedForNextEpisode ? (
          // User has already made their pick - show a "View Pick" card instead
          <Link
            to={primaryLeagueId ? `/leagues/${primaryLeagueId}/pick` : '/leagues'}
            className="col-span-2 bg-green-600 hover:bg-green-700 text-white rounded-2xl p-6 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Target className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <EditableText copyKey="dashboard.cta.pick_submitted" as="h3" className="font-bold text-xl">
                  {getCopy('dashboard.cta.pick_submitted', 'Pick Submitted ✓')}
                </EditableText>
                <p className="text-green-100 text-sm mt-1">
                  Episode {nextEpisode.number} —{' '}
                  <EditableText copyKey="dashboard.cta.pick_locked" as="span" className="text-green-100 text-sm">
                    {getCopy('dashboard.cta.pick_locked', 'Your pick is locked in!')}
                  </EditableText>
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-200" />
              <span className="text-sm text-green-100">
                <EditableText copyKey="dashboard.cta.episode_airs_in" as="span" className="text-sm text-green-100">
                  {getCopy('dashboard.cta.episode_airs_in', 'Episode airs in')}
                </EditableText>{' '}
                {getCountdownText(new Date(nextEpisode.air_date))}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            to={primaryLeagueId ? `/leagues/${primaryLeagueId}/pick` : '/leagues'}
            className="col-span-2 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-2xl p-6 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Target className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <EditableText copyKey="dashboard.cta.make_pick" as="h3" className="font-bold text-xl">
                  {getCopy('dashboard.cta.make_pick', 'Make Your Pick')}
                </EditableText>
                <p className="text-burgundy-100 text-sm mt-1">
                  Episode {nextEpisode.number} —{' '}
                  <EditableText copyKey="dashboard.cta.lock_before" as="span" className="text-burgundy-100 text-sm">
                    {getCopy('dashboard.cta.lock_before', 'Lock in before Wed 8pm ET')}
                  </EditableText>
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
              <Clock className="h-4 w-4 text-burgundy-200" />
              <span className="text-sm text-burgundy-100">
                <EditableText copyKey="dashboard.cta.picks_lock_in" as="span" className="text-sm text-burgundy-100">
                  {getCopy('dashboard.cta.picks_lock_in', 'Picks lock in')}
                </EditableText>{' '}
                {getCountdownText(new Date(nextEpisode.picks_lock_at))}
              </span>
            </div>
          </Link>
        )
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
              <EditableText copyKey="dashboard.cta.view_standings" as="h3" className="font-bold text-xl">
                {getCopy('dashboard.cta.view_standings', 'View Final Standings')}
              </EditableText>
              <p className="text-burgundy-100 text-sm mt-1">
                {activeSeason ? (
                  <>
                    <EditableText copyKey="dashboard.cta.season" as="span" className="text-burgundy-100 text-sm">
                      {getCopy('dashboard.cta.season', 'Season')}
                    </EditableText>{' '}
                    {activeSeason.number}{' '}
                    <EditableText copyKey="dashboard.cta.results_in" as="span" className="text-burgundy-100 text-sm">
                      {getCopy('dashboard.cta.results_in', 'results are in!')}
                    </EditableText>
                  </>
                ) : (
                  <EditableText copyKey="dashboard.cta.results_in_simple" as="span" className="text-burgundy-100 text-sm">
                    {getCopy('dashboard.cta.results_in_simple', 'Results are in!')}
                  </EditableText>
                )}
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* Scoring Rules */}
      <Link
        to="/scoring-rules"
        className="bg-white hover:bg-cream-50 border-2 border-cream-200 hover:border-burgundy-300 rounded-2xl p-5 transition-all group"
      >
        <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-burgundy-500 transition-colors">
          <BookOpen className="h-6 w-6 text-burgundy-500 group-hover:text-white transition-colors" />
        </div>
        <EditableText copyKey="dashboard.quick.scoring_rules" as="h3" className="font-bold text-neutral-800">
          {getCopy('dashboard.quick.scoring_rules', 'Scoring Rules')}
        </EditableText>
        <EditableText copyKey="dashboard.quick.scoring_rules_desc" as="p" className="text-neutral-500 text-sm mt-1">
          {getCopy('dashboard.quick.scoring_rules_desc', 'See how you score')}
        </EditableText>
      </Link>

      {/* View Castaways */}
      <Link
        to="/castaways"
        className="bg-white hover:bg-cream-50 border-2 border-cream-200 hover:border-burgundy-300 rounded-2xl p-5 transition-all group"
      >
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-500 transition-colors">
          <Flame className="h-6 w-6 text-orange-500 group-hover:text-white transition-colors" />
        </div>
        <h3 className="font-bold text-neutral-800">
          {castawayCount > 0 ? castawayCount : ''}{' '}
          <EditableText copyKey="dashboard.quick.castaways" as="span" className="font-bold text-neutral-800">
            {getCopy('dashboard.quick.castaways', 'Castaways')}
          </EditableText>
        </h3>
        <EditableText copyKey="dashboard.quick.castaways_desc" as="p" className="text-neutral-500 text-sm mt-1">
          {getCopy('dashboard.quick.castaways_desc', 'Meet the players')}
        </EditableText>
      </Link>
    </div>
  );
}
