import { Globe, Lock } from 'lucide-react';

interface PrivacySettingsProps {
  isPrivate: boolean;
  setIsPrivate: (isPrivate: boolean) => void;
  joinCode: string;
  setJoinCode: (joinCode: string) => void;
}

export function PrivacySettings({
  isPrivate,
  setIsPrivate,
  joinCode,
  setJoinCode,
}: PrivacySettingsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h2 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-burgundy-500" />
        Privacy
      </h2>

      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={() => setIsPrivate(false)}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            !isPrivate
              ? 'border-burgundy-500 bg-burgundy-50'
              : 'border-cream-200 bg-white hover:border-cream-300'
          }`}
        >
          <Globe
            className={`h-6 w-6 mx-auto mb-2 ${!isPrivate ? 'text-burgundy-500' : 'text-neutral-400'}`}
          />
          <p
            className={`font-medium text-sm ${!isPrivate ? 'text-burgundy-700' : 'text-neutral-600'}`}
          >
            Public
          </p>
          <p className="text-xs text-neutral-400 mt-1">Anyone can join</p>
        </button>

        <button
          type="button"
          onClick={() => setIsPrivate(true)}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            isPrivate
              ? 'border-burgundy-500 bg-burgundy-50'
              : 'border-cream-200 bg-white hover:border-cream-300'
          }`}
        >
          <Lock
            className={`h-6 w-6 mx-auto mb-2 ${isPrivate ? 'text-burgundy-500' : 'text-neutral-400'}`}
          />
          <p
            className={`font-medium text-sm ${isPrivate ? 'text-burgundy-700' : 'text-neutral-600'}`}
          >
            Private
          </p>
          <p className="text-xs text-neutral-400 mt-1">Requires code</p>
        </button>
      </div>

      {isPrivate && (
        <label className="block animate-fade-in">
          <span className="text-neutral-700 text-sm font-medium mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4 text-neutral-400" />
            Password (Optional)
          </span>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter an optional password"
            className="input"
            maxLength={100}
          />
          <p className="text-neutral-400 text-xs mt-2">
            A unique invite code will be auto-generated. Add a password for extra security.
          </p>
        </label>
      )}
    </div>
  );
}
