/**
 * Pick Warnings Component
 *
 * Shows contextual warnings about pick status (auto-picked, urgent, etc.)
 */

import { AlertCircle, Clock } from 'lucide-react';

interface PickWarningsProps {
  wasAutoPicked: boolean;
  pickSubmitted: boolean;
  isUrgent: boolean;
  isVeryUrgent: boolean;
}

export function PickWarnings({
  wasAutoPicked,
  pickSubmitted,
  isUrgent,
  isVeryUrgent,
}: PickWarningsProps) {
  return (
    <>
      {/* Auto-Pick Warning */}
      {wasAutoPicked && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-slide-up"
          style={{ animationDelay: '0.05s' }}
        >
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">You were auto-picked last episode</p>
            <p className="text-sm text-amber-700">
              You didn't submit a pick in time, so the system picked for you. Make sure to submit
              your pick before the deadline!
            </p>
          </div>
        </div>
      )}

      {/* No Pick Warning */}
      {!pickSubmitted && !isVeryUrgent && isUrgent && (
        <div
          className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 animate-slide-up"
          style={{ animationDelay: '0.05s' }}
        >
          <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-800">Don't forget to pick!</p>
            <p className="text-sm text-orange-700">
              If you don't submit a pick, the system will auto-select your highest-ranked active
              castaway.
            </p>
          </div>
        </div>
      )}

      {/* Very Urgent Warning */}
      {!pickSubmitted && isVeryUrgent && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Less than 30 minutes left!</p>
            <p className="text-sm text-red-700">Submit your pick now or you'll be auto-picked!</p>
          </div>
        </div>
      )}
    </>
  );
}
