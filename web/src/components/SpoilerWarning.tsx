import { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface SpoilerWarningProps {
  weekNumber: number;
  onReveal: () => void;
  autoReveal?: boolean; // If coming from email token
}

export function SpoilerWarning({ weekNumber, onReveal, autoReveal = false }: SpoilerWarningProps) {
  const [confirmed, setConfirmed] = useState(false);

  // Auto-reveal if coming from email (but still show brief warning)
  useEffect(() => {
    if (autoReveal && !confirmed) {
      const timer = setTimeout(() => {
        setConfirmed(true);
        onReveal();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [autoReveal, confirmed, onReveal]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-elevated p-8 text-center animate-fade-in">
        {/* Warning Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-amber-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-display font-bold text-neutral-800 mb-3">
          Week {weekNumber} Results
        </h1>

        {/* Warning Message */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-900 font-semibold mb-2">Spoiler Warning</p>
          <p className="text-amber-800 text-sm leading-relaxed">
            This page contains episode spoilers including eliminations, immunity results, and other
            gameplay events. Click below when you're ready to view your scores and standings.
          </p>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-center justify-center gap-3 mb-6 cursor-pointer group">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-neutral-300 text-burgundy-600 focus:ring-2 focus:ring-burgundy-500 focus:ring-offset-2 cursor-pointer"
          />
          <span className="text-neutral-700 group-hover:text-neutral-900 transition-colors">
            I understand and want to see results
          </span>
        </label>

        {/* Reveal Button */}
        <button
          onClick={onReveal}
          disabled={!confirmed}
          className={`w-full btn ${
            confirmed ? 'btn-primary' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
          } flex items-center justify-center gap-2 transition-all`}
        >
          {confirmed ? (
            <>
              <Eye className="w-5 h-5" />
              Show Results
            </>
          ) : (
            <>
              <EyeOff className="w-5 h-5" />
              Confirm to Continue
            </>
          )}
        </button>

        {/* Skip Message */}
        <p className="text-neutral-500 text-sm mt-4">
          Not ready yet? You can always come back later.
        </p>

        {autoReveal && (
          <p className="text-burgundy-600 text-sm mt-2 animate-pulse">
            Auto-revealing in a moment...
          </p>
        )}
      </div>
    </div>
  );
}
