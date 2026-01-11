/**
 * Finalize Scoring Modal Component
 */
import { AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react';

interface ScoringStatus {
  is_complete: boolean;
  total_castaways: number;
  scored_castaways: number;
  unscored_castaway_ids: string[];
  unscored_castaway_names: string[];
  is_finalized: boolean;
}

interface FinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  scoringStatus: ScoringStatus | null;
}

export function FinalizeModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isPending, 
  scoringStatus 
}: FinalizeModalProps) {
  if (!isOpen) return null;
  const isReady = scoringStatus?.is_complete;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-full ${isReady ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              {isReady ? <CheckCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-cream-100 rounded-full transition-colors text-neutral-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <h3 className="text-xl font-display font-bold text-neutral-900 mb-2">
            Finalize Episode Scoring
          </h3>
          
          <div className="space-y-4 mb-6">
            <p className="text-neutral-600">
              Finalizing will lock all scores for this episode and update the global and private league standings.
            </p>

            {!isReady && scoringStatus && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 font-medium mb-2">
                  Warning: Scoring is incomplete
                </p>
                <p className="text-xs text-amber-700">
                  {scoringStatus.total_castaways - scoringStatus.scored_castaways} castaways have no points recorded. 
                  Finalizing will assume they earned 0 points.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {scoringStatus.unscored_castaway_names.map((name: string) => (
                    <span key={name} className="px-1.5 py-0.5 bg-amber-200/50 text-amber-800 rounded text-[10px]">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs text-red-700 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> This action cannot be easily undone.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-cream-100 text-neutral-700 font-bold rounded-xl hover:bg-cream-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 px-4 py-3 bg-burgundy-600 text-white font-bold rounded-xl hover:bg-burgundy-700 transition-colors shadow-lg shadow-burgundy-500/20 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                'Finalize Now'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
