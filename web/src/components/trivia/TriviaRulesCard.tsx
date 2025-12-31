/**
 * Trivia Rules Card Component
 *
 * Explains how the trivia challenge works.
 */

import { Flame, Clock, Lock, Trophy } from 'lucide-react';

export function TriviaRulesCard() {
  return (
    <div className="text-center mb-12">
      <div className="flex items-center justify-center gap-3 mb-6">
        <Flame className="h-12 w-12 text-burgundy-500" />
        <h1 className="text-5xl md:text-6xl font-display font-bold text-neutral-800">
          Survivor Trivia Challenge
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-8 border-2 border-burgundy-200 mb-8 max-w-3xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-burgundy-600 mb-6">How It Works</h2>

        <div className="space-y-4 text-left">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-burgundy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-burgundy-600 font-bold">1</span>
            </div>
            <div>
              <p className="font-semibold text-neutral-800 mb-1">Answer All 24 Questions</p>
              <p className="text-neutral-600 text-sm">
                You can answer all 24 questions in one day if you get them all right. Prove you're a
                true Survivor fan!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Clock className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-neutral-800 mb-1">20 Seconds Per Question</p>
              <p className="text-neutral-600 text-sm">
                Each question has a 20-second timer. Time runs out? That counts as wrong.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Lock className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-neutral-800 mb-1">
                Get One Wrong? <span className="text-red-600">You have to try again tomorrow</span>
              </p>
              <p className="text-neutral-600 text-sm">
                Miss a question or run out of time? You're locked out for 24 hours. Come back
                tomorrow to continue.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-burgundy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Trophy className="h-4 w-4 text-burgundy-600" />
            </div>
            <div>
              <p className="font-semibold text-neutral-800 mb-1">
                Leaderboard Tracks Your Progress
              </p>
              <p className="text-neutral-600 text-sm">
                See how many days it took you to complete all 24 questions. Fastest completion wins!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
