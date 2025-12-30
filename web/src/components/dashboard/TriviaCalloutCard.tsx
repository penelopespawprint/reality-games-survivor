/**
 * Trivia Callout Card
 *
 * Promotes the daily trivia feature while users wait for the season to start.
 */

import { Link } from 'react-router-dom';
import { Brain, Trophy, Zap, ArrowRight, Sparkles, Megaphone } from 'lucide-react';

interface TriviaCalloutCardProps {
  /** Whether the season has started (hide if true) */
  seasonStarted?: boolean;
}

export function TriviaCalloutCard({ seasonStarted = false }: TriviaCalloutCardProps) {
  // Don't show during active season
  if (seasonStarted) return null;

  return (
    <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-elevated relative overflow-hidden">
      {/* Special Announcement Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
        <Megaphone className="h-3 w-3" />
        <span className="text-xs font-medium">Featured</span>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">Daily Survivor Trivia</h3>
            <p className="text-purple-200 text-sm">Test your knowledge!</p>
          </div>
        </div>

        <p className="text-purple-100 text-sm mb-4">
          While you wait for Season 50, challenge yourself with daily trivia questions spanning all
          49 seasons of Survivor!
        </p>

        {/* Stats/Features */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-300" />
            <p className="text-xs text-purple-200">24 Questions</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <Trophy className="h-4 w-4 mx-auto mb-1 text-yellow-300" />
            <p className="text-xs text-purple-200">Leaderboard</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <Sparkles className="h-4 w-4 mx-auto mb-1 text-yellow-300" />
            <p className="text-xs text-purple-200">New Daily</p>
          </div>
        </div>

        <Link
          to="/trivia"
          className="flex items-center justify-center gap-2 w-full bg-white text-purple-600 font-bold py-3 rounded-xl hover:bg-purple-50 transition-colors"
        >
          Play Trivia Now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
