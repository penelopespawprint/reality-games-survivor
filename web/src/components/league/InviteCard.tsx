/**
 * Invite Card Component
 *
 * Shows invite link/code for sharing the league.
 */

import { Copy, Check, Share2 } from 'lucide-react';
import type { League } from '@/types';

interface InviteCardProps {
  league: League;
  canManageLeague: boolean;
  copied: boolean;
  onCopyInvite: () => void;
}

export function InviteCard({ league, canManageLeague, copied, onCopyInvite }: InviteCardProps) {
  if (canManageLeague) {
    return (
      <div className="mt-6 bg-white rounded-2xl shadow-card p-5 border border-cream-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-neutral-500 text-sm">League Invite Code</p>
            <p className="font-mono text-2xl font-bold text-burgundy-600 tracking-wider">
              {league.code}
            </p>
          </div>
          <button onClick={onCopyInvite} className="btn btn-secondary flex items-center gap-2">
            {copied ? (
              <>
                <Check className="h-5 w-5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Copy Invite Link
              </>
            )}
          </button>
        </div>
        <p className="text-neutral-400 text-xs mt-2">
          Share this link: {window.location.origin}/join/{league.code}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-card p-5 border border-cream-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-neutral-500 text-sm">Invite Friends</p>
          <p className="text-neutral-700 font-medium">Share the invite link to grow your league!</p>
        </div>
        <button onClick={onCopyInvite} className="btn btn-primary flex items-center gap-2">
          {copied ? (
            <>
              <Check className="h-5 w-5" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="h-5 w-5" />
              Share Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
