/**
 * Home Page - Main landing page for survivor.realitygamesfantasyleague.com
 *
 * Single-screen landing page for Season 50.
 * Redirects logged-in users to the dashboard.
 */

import { Link, Navigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Flame, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function Home() {
  const { user, loading } = useAuth();

  // Redirect logged-in users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      {/* Navigation */}
      <Navigation />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-burgundy-100 text-burgundy-700 px-3 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Flame className="h-4 w-4" />
            Season 50 Now Open
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl text-neutral-800 leading-[1.1] mb-6"
            style={{ fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 400 }}
          >
            Fantasy Survivor
            <br />
            for People Who
            <br />
            <span className="italic text-burgundy-600">Actually</span> Watch
          </h1>

          <p className="text-lg sm:text-xl text-neutral-600 mb-10 max-w-xl mx-auto">
            Draft castaways. Set weekly lineups. Earn points for every confessional, idol play, and
            blindside. Prove you know the game.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/signup"
              className="bg-burgundy-600 hover:bg-burgundy-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Flame className="h-5 w-5" />
              Join Free
            </Link>
            <Link
              to="/how-to-play"
              className="bg-white hover:bg-cream-100 text-neutral-800 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-cream-200 hover:border-cream-300 transition-all inline-flex items-center justify-center w-full sm:w-auto"
            >
              How It Works
            </Link>
            <Link
              to="/trivia"
              className="bg-white hover:bg-cream-100 text-neutral-800 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-cream-200 hover:border-cream-300 transition-all inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Mail className="h-5 w-5" />
              Sign Up for Trivia
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Home;
