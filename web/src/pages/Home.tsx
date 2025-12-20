import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-tribal-950/50 via-neutral-950 to-jungle-950/30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="font-display text-6xl sm:text-8xl text-white tracking-tight">
              SURVIVOR
              <span className="block text-tribal-500">FANTASY</span>
            </h1>

            <p className="mt-6 text-xl text-neutral-300 max-w-2xl mx-auto">
              Draft your castaways. Make weekly picks. Outwit, outplay, and outlast your friends.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to="/dashboard" className="btn btn-primary text-lg px-8 py-3">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary text-lg px-8 py-3">
                    Get Started
                  </Link>
                  <Link to="/how-to-play" className="btn btn-secondary text-lg px-8 py-3">
                    How to Play
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card">
            <div className="w-12 h-12 rounded-lg bg-tribal-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🏝️</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Draft Castaways</h3>
            <p className="text-neutral-400">
              Build your roster by drafting 2 castaways in a snake draft with your league.
            </p>
          </div>

          <div className="card">
            <div className="w-12 h-12 rounded-lg bg-jungle-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Weekly Picks</h3>
            <p className="text-neutral-400">
              Pick one castaway each week to earn points based on their performance.
            </p>
          </div>

          <div className="card">
            <div className="w-12 h-12 rounded-lg bg-ocean-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🏆</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Compete & Win</h3>
            <p className="text-neutral-400">
              Climb the leaderboard and crown the ultimate Survivor fantasy champion.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-neutral-500 text-sm">
              © 2025 Reality Games Fantasy League. Not affiliated with CBS or Survivor.
            </p>
            <div className="flex gap-6">
              <Link to="/rules" className="text-neutral-400 hover:text-white text-sm">Rules</Link>
              <Link to="/contact" className="text-neutral-400 hover:text-white text-sm">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
