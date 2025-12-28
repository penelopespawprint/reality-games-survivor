/**
 * Finalize Modal Component
 *
 * Confirmation modal for finalizing episode scores.
 */

import { Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ScoringStatus {
  is_complete: boolean;
  total_castaways: number;
  scored_castaways: number;
  unscored_castaway_ids: string[];
  unscored_castaway_names: string[];
  is_finalized: boolean;
}

interface Episode {
  id: string;
  number: number;
  title: string | null;
}

interface FinalizeModalProps {
  episode: Episode | undefined;
  scoringStatus: ScoringStatus | null | undefined;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FinalizeModal({
  episode,
  scoringStatus,
  isPending,
  onConfirm,
  onCancel,
}: FinalizeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-neutral-800">
                Finalize Episode {episode?.number}?
              </h3>
              <p className="text-sm text-neutral-500">
                {episode?.title || 'This action cannot be undone'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {scoringStatus && !scoringStatus.is_complete && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-red-800 mb-2">Incomplete Scoring Detected</p>
            <p className="text-sm text-red-700 mb-2">
              {scoringStatus.scored_castaways} of {scoringStatus.total_castaways} castaways scored.
              Missing:
            </p>
            <div className="flex flex-wrap gap-1">
              {scoringStatus.unscored_castaway_names.map((name) => (
                <span key={name} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Warning:</strong> Finalizing will:
          </p>
          <ul className="text-sm text-amber-700 mt-2 space-y-1">
            <li>• Lock all scores for this episode</li>
            <li>• Update all players' points and rankings</li>
            <li>• Mark eliminated castaways</li>
            <li>• Make results visible to all users</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn btn-secondary" disabled={isPending}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            disabled={isPending || !scoringStatus?.is_complete}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalizing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Finalize Scores
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
