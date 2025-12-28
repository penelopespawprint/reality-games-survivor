/**
 * League Header Component
 *
 * Shows league name, commissioner, stats bar, and charity badge.
 */

import { Link } from 'react-router-dom';
import { Crown, Settings, Share2, Check, Heart } from 'lucide-react';
import type { League, LeagueMember } from '@/types';

interface LeagueHeaderProps {
  league: League;
  members: LeagueMember[] | undefined;
  myMembership: LeagueMember | undefined;
  canManageLeague: boolean;
  copied: boolean;
  onCopyInvite: () => void;
}

export function LeagueHeader({
  league,
  members,
  myMembership,
  canManageLeague,
  copied,
  onCopyInvite,
}: LeagueHeaderProps) {
  return (
    <div className="bg-white rounded-2xl shadow-elevated p-6 border border-cream-200 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-800">{league.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-neutral-500">
            <Crown className="h-4 w-4 text-burgundy-400" />
            <span className="text-sm">{(league.commissioner as any)?.display_name}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-sm">Season {(league as any).seasons?.number}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyInvite}
            className="p-2 bg-cream-50 rounded-xl hover:bg-cream-100 transition-all border border-cream-200"
            title="Copy invite link"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Share2 className="h-5 w-5 text-neutral-600" />
            )}
          </button>
          {canManageLeague && (
            <Link
              to={`/leagues/${league.id}/settings`}
              className="p-2 bg-cream-50 rounded-xl hover:bg-cream-100 transition-all border border-cream-200"
              title="League Settings"
            >
              <Settings className="h-5 w-5 text-neutral-600" />
            </Link>
          )}
        </div>
      </div>

      {/* League Stats Bar */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-cream-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-neutral-800">{members?.length || 0}</p>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Players</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-burgundy-600">#{myMembership?.rank || '-'}</p>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Your Rank</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-neutral-800">{myMembership?.total_points || 0}</p>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Your Points</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 capitalize">{league.status}</p>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Status</p>
        </div>
      </div>

      {/* Charity Badge */}
      {league.require_donation && (
        <div className="mt-4 flex items-center gap-3 p-3 bg-gradient-to-r from-burgundy-50 to-cream-50 rounded-xl border border-burgundy-100">
          <Heart className="h-5 w-5 text-burgundy-500 flex-shrink-0" />
          <div>
            <p className="text-burgundy-700 font-medium text-sm">
              ${league.donation_amount} Charity Entry
            </p>
            <p className="text-burgundy-500 text-xs">
              All proceeds donated to charity chosen by winner
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
