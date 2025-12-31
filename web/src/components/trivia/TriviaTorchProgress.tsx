/**
 * Trivia Torch Progress Component
 *
 * Shows progress through the 24 questions with torch icons.
 * Lit torches = correct answers, unlit = remaining questions.
 */

import { Flame } from 'lucide-react';

interface TriviaTorchProgressProps {
  questionsAnswered: number;
  totalQuestions: number;
  questionsCorrect: number;
}

export function TriviaTorchProgress({
  questionsAnswered,
  totalQuestions,
  questionsCorrect,
}: TriviaTorchProgressProps) {
  // Create array of 24 torches
  const torches = Array.from({ length: totalQuestions }, (_, i) => {
    const isLit = i < questionsCorrect;
    const isCurrent = i === questionsCorrect && questionsAnswered === questionsCorrect;
    return { isLit, isCurrent, number: i + 1 };
  });

  return (
    <div className="mb-8 bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-neutral-600">
          {questionsCorrect} of {totalQuestions} torches lit
        </span>
        <span className="text-sm font-medium text-burgundy-600">{questionsCorrect} correct</span>
      </div>

      {/* Torch grid - 12 per row on desktop, 8 on tablet, 6 on mobile */}
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
        {torches.map((torch) => (
          <div
            key={torch.number}
            className={`relative flex flex-col items-center justify-center p-1 rounded-lg transition-all duration-300 ${
              torch.isLit
                ? 'bg-gradient-to-b from-orange-100 to-amber-50'
                : torch.isCurrent
                  ? 'bg-burgundy-50 ring-2 ring-burgundy-300 animate-pulse'
                  : 'bg-neutral-50'
            }`}
            title={`Question ${torch.number}${torch.isLit ? ' ✓' : ''}`}
          >
            {/* Torch icon */}
            <div className="relative">
              {/* Flame (only shown when lit) */}
              {torch.isLit && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <Flame className="h-4 w-4 text-orange-500 animate-flicker" fill="currentColor" />
                </div>
              )}
              {/* Torch handle */}
              <div
                className={`w-2 h-5 rounded-sm mt-2 ${
                  torch.isLit ? 'bg-gradient-to-b from-amber-600 to-amber-800' : 'bg-neutral-300'
                }`}
              />
            </div>
            {/* Question number */}
            <span
              className={`text-[10px] font-medium mt-1 ${
                torch.isLit ? 'text-amber-700' : 'text-neutral-400'
              }`}
            >
              {torch.number}
            </span>
          </div>
        ))}
      </div>

      {/* Add CSS for flame animation */}
      <style>{`
        @keyframes flicker {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          25% { opacity: 0.9; transform: translateX(-50%) scale(1.05); }
          50% { opacity: 1; transform: translateX(-50%) scale(0.95); }
          75% { opacity: 0.85; transform: translateX(-50%) scale(1.02); }
        }
        .animate-flicker {
          animation: flicker 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
