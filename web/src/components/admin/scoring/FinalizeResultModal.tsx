/**
 * Finalize Result Modal Component
 *
 * Shows the result of finalizing scores (success or error).
 */

import { CheckCircle, AlertTriangle } from 'lucide-react';

interface Castaway {
  id: string;
  name: string;
}

interface FinalizeResultModalProps {
  success: boolean;
  eliminated: string[];
  episodeNumber: number | undefined;
  castaways: Castaway[] | undefined;
  onClose: () => void;
}

export function FinalizeResultModal({
  success,
  eliminated,
  episodeNumber,
  castaways,
  onClose,
}: FinalizeResultModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 animate-slide-up">
        {success ? (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">
                Scores Finalized!
              </h3>
              <p className="text-neutral-500">
                Episode {episodeNumber} has been scored and all standings updated.
              </p>
            </div>

            {eliminated.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-red-800 mb-2">Eliminated Castaways:</p>
                <div className="flex flex-wrap gap-2">
                  {eliminated.map((id) => {
                    const castaway = castaways?.find((c) => c.id === id);
                    return (
                      <span key={id} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                        {castaway?.name || id}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">
              Finalization Failed
            </h3>
            <p className="text-neutral-500">
              There was an error finalizing the scores. Please try again.
            </p>
          </div>
        )}

        <button onClick={onClose} className="w-full btn btn-primary">
          {success ? 'Done' : 'Close'}
        </button>
      </div>
    </div>
  );
}
