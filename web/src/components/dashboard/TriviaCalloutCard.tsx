/**
 * Trivia Callout Card
 *
 * Promotes the daily trivia feature while users wait for the season to start.
 */

import { Link } from 'react-router-dom';
import { Brain, Trophy, ArrowRight, Sparkles } from 'lucide-react';

interface TriviaCalloutCardProps {
  /** Whether the season has started (hide if true) */
  seasonStarted?: boolean;
}

export function TriviaCalloutCard({ seasonStarted = false }: TriviaCalloutCardProps) {
  // Don't show during active season
  if (seasonStarted) return null;

  return (
    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-1/2 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />

      {/* Content */}
      <div className="relative flex items-center justify-between gap-4">
        {/* Left side - Icon and text */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-xl">Survivor Trivia</h3>
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </div>
            <p className="text-teal-100 text-sm">
              Test your knowledge with 24 questions while you wait for the season!
            </p>
          </div>
        </div>

        {/* Right side - Stats and CTA */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden md:flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2">
            <Trophy className="h-4 w-4 text-yellow-300" />
            <span className="text-sm font-medium">Compete for #1</span>
          </div>
          <Link
            to="/trivia"
            className="flex items-center justify-center gap-2 bg-white text-teal-600 font-bold px-5 py-2.5 rounded-xl hover:bg-teal-50 transition-colors whitespace-nowrap shadow-md"
          >
            Play Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
