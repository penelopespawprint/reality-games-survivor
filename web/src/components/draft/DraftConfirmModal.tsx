/**
 * Draft Confirm Modal Component
 *
 * Confirmation modal before saving draft rankings.
 */

import { Check, Loader2 } from 'lucide-react';
import type { Castaway } from '@/types';

interface DraftConfirmModalProps {
  rankings: string[];
  castawayMap: Map<string, Castaway>;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DraftConfirmModal({
  rankings,
  castawayMap,
  isPending,
  onConfirm,
  onCancel,
}: DraftConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6">
        <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">
          Confirm Your Rankings
        </h3>
        <p className="text-neutral-600 mb-4">
          Are you sure you want to save your rankings? This will apply to{' '}
          <strong>all your leagues</strong> this season.
        </p>

        {/* Top 5 Preview */}
        <div className="bg-cream-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-neutral-700 mb-3">Your Top 5 Picks:</p>
          <div className="space-y-2">
            {rankings.slice(0, 5).map((castawayId, index) => {
              const castaway = castawayMap.get(castawayId);
              if (!castaway) return null;
              return (
                <div key={castawayId} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 2
                        ? 'bg-burgundy-100 text-burgundy-600'
                        : 'bg-cream-200 text-neutral-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-neutral-800">{castaway.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 btn btn-primary flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
}
