/**
 * Scoring Header Component
 *
 * Page header with status, grid view link, and finalize button.
 */

import { Link } from 'react-router-dom';
import { Grid3X3, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Episode } from '@/types';
import type { ScoringStatus } from '@/lib/hooks';
import type { UseMutationResult } from '@tanstack/react-query';

interface ScoringHeaderProps {
  scoringStatus: ScoringStatus | null;
  selectedEpisodeId: string | null;
  selectedEpisode: Episode | undefined;
  finalizeMutation: UseMutationResult<
    { finalized: boolean; eliminated: string[]; standings_updated: boolean } | null | undefined,
    Error,
    void,
    unknown
  >;
  onShowFinalizeModal: () => void;
}

export function ScoringHeader({
  scoringStatus,
  selectedEpisodeId,
  selectedEpisode,
  finalizeMutation,
  onShowFinalizeModal,
}: ScoringHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 animate-fade-in">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link
            to="/admin"
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Back to admin dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-display text-neutral-800">Score Episode</h1>
        </div>
        <p className="text-neutral-500">Enter scores for each castaway</p>
      </div>

      <div className="flex items-center gap-3">
        {scoringStatus && selectedEpisodeId && !selectedEpisode?.is_scored && (
          <div
            className={`px-4 py-2 rounded-xl flex items-center gap-2 ${
              scoringStatus.is_complete
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {scoringStatus.is_complete ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span className="font-medium">
              {scoringStatus.scored_castaways}/{scoringStatus.total_castaways} castaways scored
            </span>
          </div>
        )}

        <Link
          to={`/admin/scoring/grid${selectedEpisodeId ? `?episode=${selectedEpisodeId}` : ''}`}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Grid3X3 className="h-4 w-4" />
          Grid View
        </Link>

        {selectedEpisodeId && !selectedEpisode?.is_scored && (
          <button
            onClick={onShowFinalizeModal}
            className="btn btn-primary flex items-center gap-2"
            disabled={finalizeMutation.isPending || !scoringStatus?.is_complete}
            title={
              !scoringStatus?.is_complete
                ? `Score all ${scoringStatus?.total_castaways || 0} castaways before finalizing`
                : 'Finalize episode scoring'
            }
          >
            {finalizeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Finalize Scores
          </button>
        )}

        {selectedEpisode?.is_scored && (
          <span className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle className="h-5 w-5" />
            Finalized
          </span>
        )}
      </div>
    </div>
  );
}
