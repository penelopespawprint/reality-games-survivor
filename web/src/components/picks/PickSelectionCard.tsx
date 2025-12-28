/**
 * Pick Selection Card Component
 *
 * Card containing castaway selection and submit button.
 */

import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { CastawayPickCard } from './CastawayPickCard';
import type { Roster, Castaway } from '@/types';

interface CastawayStats {
  castaway_id: string;
  total_points: number;
  times_picked: number;
  avg_points: number;
}

interface PickSelectionCardProps {
  roster: Roster[] | undefined;
  activeCastaways: Roster[];
  selectedCastaway: string | null;
  currentPickCastawayId: string | null | undefined;
  pickSubmitted: boolean;
  showSuccess: boolean;
  mutationError: string | null;
  isPending: boolean;
  castawayStats: CastawayStats[] | undefined;
  onSelect: (castawayId: string) => void;
  onSubmit: () => void;
}

export function PickSelectionCard({
  roster,
  activeCastaways,
  selectedCastaway,
  currentPickCastawayId,
  pickSubmitted,
  showSuccess,
  mutationError,
  isPending,
  castawayStats,
  onSelect,
  onSubmit,
}: PickSelectionCardProps) {
  const getStatsForCastaway = (castawayId: string): CastawayStats | undefined => {
    return castawayStats?.find((s) => s.castaway_id === castawayId);
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-elevated overflow-hidden animate-slide-up"
      style={{ animationDelay: '0.1s' }}
    >
      <div className="p-6 border-b border-cream-100">
        <h2 className="font-semibold text-neutral-800">Select Your Castaway</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Choose which player from your roster to play this week
        </p>
      </div>

      <div className="p-6 space-y-4">
        {activeCastaways.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">No Active Castaways</h3>
            <p className="text-neutral-500 mb-4">
              {roster && roster.length > 0
                ? 'All your castaways have been eliminated. Your season has ended.'
                : "Your roster is empty. This shouldn't happen - please contact support."}
            </p>
          </div>
        ) : (
          activeCastaways.map((entry) => (
            <CastawayPickCard
              key={entry.id}
              castaway={entry.castaways as Castaway}
              isSelected={selectedCastaway === entry.castaway_id}
              stats={getStatsForCastaway(entry.castaway_id)}
              onSelect={() => onSelect(entry.castaway_id)}
            />
          ))
        )}
      </div>

      {/* Submit */}
      <div className="p-6 border-t border-cream-100 bg-cream-50/50">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">Pick Saved!</p>
              <p className="text-sm text-green-600">You can change it until picks lock.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {mutationError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Failed to Save</p>
              <p className="text-sm text-red-600">{mutationError}</p>
            </div>
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={!selectedCastaway || isPending}
          className={`w-full btn ${
            selectedCastaway
              ? 'btn-primary shadow-card'
              : 'bg-cream-200 text-neutral-400 cursor-not-allowed'
          }`}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : pickSubmitted ? (
            'Update Pick'
          ) : selectedCastaway ? (
            'Confirm Pick'
          ) : (
            'Select a Castaway'
          )}
        </button>
        {pickSubmitted && !showSuccess && (
          <p className="text-center text-sm text-neutral-500 mt-3">
            Current pick:{' '}
            <span className="font-medium text-neutral-700">
              {roster?.find((r) => r.castaway_id === currentPickCastawayId)?.castaways?.name}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
