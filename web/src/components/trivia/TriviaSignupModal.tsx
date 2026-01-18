/**
 * Trivia Signup Modal Component
 * Conversion hook shown when user misses a question or completes all 24
 */
import { Link } from 'react-router-dom';
import { X, Trophy, Users, Star, ArrowRight } from 'lucide-react';

interface TriviaSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'missed' | 'completed';
  score?: number;
  totalQuestions?: number;
}

export function TriviaSignupModal({
  isOpen,
  onClose,
  reason,
  score,
  totalQuestions = 24,
}: TriviaSignupModalProps) {
  if (!isOpen) return null;

  const isCompleted = reason === 'completed';
  const isPerfect = isCompleted && score === totalQuestions;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-elevated max-w-lg w-full p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          {isPerfect ? (
            <>
              <div className="text-6xl mb-4">👑</div>
              <h2 className="text-3xl font-display font-bold text-neutral-800 mb-2">
                Perfect Score!
              </h2>
              <p className="text-lg text-burgundy-600">
                {score}/{totalQuestions} - You're a true Survivor master!
              </p>
            </>
          ) : isCompleted ? (
            <>
              <div className="text-5xl mb-4">🔥</div>
              <h2 className="text-3xl font-display font-bold text-neutral-800 mb-2">
                Impressive!
              </h2>
              <p className="text-lg text-burgundy-600">
                {score}/{totalQuestions} Correct - Great job!
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">⏰</div>
              <h2 className="text-3xl font-display font-bold text-neutral-800 mb-2">
                Locked Out for 2 Hours
              </h2>
              <p className="text-lg text-neutral-600">
                You missed a question. Come back tomorrow to try again!
              </p>
            </>
          )}
        </div>

        {/* Conversion Content */}
        <div className="bg-gradient-to-r from-burgundy-500 to-red-600 rounded-xl p-6 text-white mb-6">
          <h3 className="text-2xl font-display font-bold mb-3 text-center">
            Ready to Play for Real?
          </h3>
          <p className="text-burgundy-100 text-center mb-6">
            Join Season 50 and compete in fantasy leagues. Draft castaways, make weekly picks, and prove you're the ultimate Survivor fan!
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Join Leagues</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">100+ Rules</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trophy className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Win Prizes</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/dashboard"
              onClick={onClose}
              className="flex-1 bg-white text-burgundy-600 font-display font-bold px-6 py-3 rounded-xl hover:bg-cream-100 transition-colors text-center flex items-center justify-center gap-2"
            >
              Join a League
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/how-to-play"
              onClick={onClose}
              className="flex-1 bg-white/10 text-white font-display font-semibold px-6 py-3 rounded-xl border-2 border-white/30 hover:bg-white/20 transition-all text-center"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Lockout Message (if missed) */}
        {reason === 'missed' && (
          <div className="text-center">
            <p className="text-sm text-neutral-500">
              Your lockout expires in 2 hours. Check back soon to continue!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
