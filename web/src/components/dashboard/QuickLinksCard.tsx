/**
 * Quick Links Card Component
 *
 * Displays helpful navigation links.
 */

import { Link } from 'react-router-dom';
import { BookOpen, Target, Flame, ChevronRight } from 'lucide-react';

export function QuickLinksCard() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-cream-200">
      <h3 className="font-semibold text-neutral-800 mb-4">Quick Links</h3>
      <div className="space-y-2">
        <Link
          to="/how-to-play"
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 transition-colors text-left"
        >
          <BookOpen className="h-5 w-5 text-neutral-400" />
          <span className="text-sm text-neutral-700">How to Play</span>
          <ChevronRight className="h-4 w-4 text-neutral-300 ml-auto" />
        </Link>
        <Link
          to="/scoring-rules"
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 transition-colors text-left"
        >
          <Target className="h-5 w-5 text-neutral-400" />
          <span className="text-sm text-neutral-700">Scoring Rules</span>
          <ChevronRight className="h-4 w-4 text-neutral-300 ml-auto" />
        </Link>
        <Link
          to="/castaways"
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 transition-colors text-left"
        >
          <Flame className="h-5 w-5 text-neutral-400" />
          <span className="text-sm text-neutral-700">View Castaways</span>
          <ChevronRight className="h-4 w-4 text-neutral-300 ml-auto" />
        </Link>
      </div>
    </div>
  );
}
