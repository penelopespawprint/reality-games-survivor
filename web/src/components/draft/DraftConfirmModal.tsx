/**
 * Draft Confirm Modal Component
 *
 * Confirmation modal before saving draft rankings.
 * Shows complete list of all castaways with their rankings.
 */

import { Check, Loader2, X } from 'lucide-react';
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
      <div className="bg-white rounded-2xl shadow-elevated max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-cream-100 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-display font-bold text-neutral-800">
              Confirm Your Rankings
            </h3>
            <p className="text-neutral-500 text-sm mt-1">
              This will apply to <strong className="text-neutral-700">all your leagues</strong> this season
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        {/* Scrollable Rankings List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-cream-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-neutral-700">Your Complete Rankings</p>
              <span className="text-xs text-neutral-500">{rankings.length} castaways</span>
            </div>
            <div className="space-y-1">
              {rankings.map((castawayId, index) => {
                const castaway = castawayMap.get(castawayId);
                if (!castaway) return null;
                
                // Highlight tiers: top 2 (likely picks), top 6 (safe zone), rest
                const isTopPick = index < 2;
                const isSafeZone = index >= 2 && index < 6;
                
                return (
                  <div 
                    key={castawayId} 
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isTopPick 
                        ? 'bg-burgundy-50 border border-burgundy-100' 
                        : isSafeZone 
                          ? 'bg-amber-50/50' 
                          : 'hover:bg-cream-100'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isTopPick
                          ? 'bg-burgundy-500 text-white'
                          : isSafeZone
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-cream-200 text-neutral-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                    {castaway.photo_url && (
                      <img 
                        src={castaway.photo_url} 
                        alt={castaway.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={`block truncate ${isTopPick ? 'font-medium text-burgundy-800' : 'text-neutral-700'}`}>
                        {castaway.name}
                      </span>
                      {castaway.tribe_original && (
                        <span className="text-xs text-neutral-400">{castaway.tribe_original}</span>
                      )}
                    </div>
                    {isTopPick && (
                      <span className="text-xs font-medium text-burgundy-600 bg-burgundy-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        Top Pick
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="p-4 border-t border-cream-100 bg-cream-50/50">
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 btn btn-secondary">
              Go Back
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
    </div>
  );
}
