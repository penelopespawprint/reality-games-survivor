/**
 * Castaway Header Component
 *
 * Header showing selected castaway info and live scoring total.
 */

import { Loader2, Save } from 'lucide-react';

interface Castaway {
  id: string;
  name: string;
  photo_url: string | null;
}

interface Episode {
  number: number;
}

interface CastawayHeaderProps {
  castaway: Castaway | undefined;
  episode: Episode | undefined;
  liveTotal: number;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
}

export function CastawayHeader({
  castaway,
  episode,
  liveTotal,
  isSaving,
  isDirty,
  lastSavedAt,
}: CastawayHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-6 text-white shadow-elevated">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            {castaway?.photo_url ? (
              <img
                src={castaway.photo_url}
                alt={castaway.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <span className="text-2xl font-bold">{castaway?.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-display">{castaway?.name}</h2>
            <p className="text-burgundy-100">Episode {episode?.number}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Live Total */}
          <div className="text-center">
            <p className="text-burgundy-200 text-sm">Episode Total</p>
            <p
              className={`text-4xl font-display font-bold ${liveTotal >= 0 ? 'text-white' : 'text-red-200'}`}
            >
              {liveTotal >= 0 ? '+' : ''}
              {liveTotal}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="text-xs text-burgundy-200 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {isDirty && !isSaving && (
                <span className="text-xs text-burgundy-200">Unsaved changes</span>
              )}
              {lastSavedAt && !isDirty && !isSaving && (
                <span className="text-xs text-green-200 flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-xs text-burgundy-200">Auto-saves after 2 seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
}
