/**
 * Visibility Settings Component
 *
 * Public/private toggle and max players settings.
 */

import { Globe, Eye, EyeOff } from 'lucide-react';

interface VisibilitySettingsProps {
  isPublic: boolean;
  maxPlayers: number;
  currentMemberCount: number;
  draftStatus: string | undefined;
  onPublicChange: (isPublic: boolean) => void;
  onMaxPlayersChange: (maxPlayers: number) => void;
}

export function VisibilitySettings({
  isPublic,
  maxPlayers,
  currentMemberCount,
  draftStatus,
  onPublicChange,
  onMaxPlayersChange,
}: VisibilitySettingsProps) {
  const canChangeMaxPlayers = currentMemberCount === 0 || draftStatus === 'pending';

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h3 className="text-neutral-800 font-medium mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-burgundy-500" />
        Visibility & Access
      </h3>

      <label className="flex items-center justify-between cursor-pointer mb-4 p-3 bg-cream-50 rounded-xl border border-cream-200">
        <div className="flex items-center gap-3">
          {isPublic ? (
            <Eye className="h-5 w-5 text-burgundy-500" />
          ) : (
            <EyeOff className="h-5 w-5 text-neutral-400" />
          )}
          <div>
            <span className="text-neutral-800 font-medium block">Public League</span>
            <span className="text-neutral-500 text-sm">Anyone can view standings</span>
          </div>
        </div>
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => onPublicChange(e.target.checked)}
          className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
        />
      </label>

      <label className="block">
        <span className="text-neutral-500 text-sm mb-2 block">Max Players</span>
        <select
          value={maxPlayers}
          onChange={(e) => onMaxPlayersChange(parseInt(e.target.value))}
          disabled={!canChangeMaxPlayers}
          className="input disabled:opacity-50"
        >
          {[4, 6, 8, 10, 12, 16, 20, 24].map((n) => (
            <option key={n} value={n} disabled={n < currentMemberCount}>
              {n} players
            </option>
          ))}
        </select>
        {currentMemberCount > 0 && (
          <p className="text-neutral-400 text-xs mt-1">
            Currently {currentMemberCount} of {maxPlayers} players
          </p>
        )}
      </label>
    </div>
  );
}
