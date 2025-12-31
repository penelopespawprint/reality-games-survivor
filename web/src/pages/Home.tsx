/**
 * Home Page - Main landing page for survivor.realitygamesfantasyleague.com
 *
 * Fantasy Survivor landing with Season 50 signup CTAs and trivia email signup.
 * Redirects logged-in users to the dashboard.
 */

import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function Home() {
  const { user, loading } = useAuth();

  // Redirect logged-in users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Store email in localStorage for now (could be sent to backend later)
      const existingEmails = JSON.parse(localStorage.getItem('triviaEmails') || '[]');
      if (!existingEmails.includes(email)) {
        existingEmails.push(email);
        localStorage.setItem('triviaEmails', JSON.stringify(existingEmails));
      }

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      setIsSubscribed(true);
      setEmail('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #F5F0E8 0%, #E8E0D5 50%, #DED4C4 100%)' }}
    >
      {/* Navigation */}
      <Navigation />

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full">
        <div className="text-center">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl text-gray-900 leading-[0.95] mb-8"
            style={{ fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 400 }}
          >
            Fantasy Survivor
            <br />
            for People Who
            <br />
            <span className="italic text-red-800">Actually</span> Watch
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
            100+ scoring rules. Real strategy. No luck required.
            <br />
            Draft your castaways and prove you know the game.
          </p>

          {/* Dual CTAs - Equal Weight */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <Link
              to="/signup"
              className="bg-red-800 hover:bg-red-900 text-white px-6 py-3 rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              Join Season 50 <span>→</span>
            </Link>
            <Link
              to="/how-to-play"
              className="bg-white hover:bg-gray-50 text-gray-800 px-6 py-3 rounded-xl font-semibold text-base border-2 border-gray-300 hover:border-gray-400 transition-all shadow-sm"
            >
              How It Works
            </Link>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 max-w-md mx-auto mb-8">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-400 text-sm font-medium">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Email Capture - Secondary */}
          <p className="text-gray-600 text-lg mb-4">
            Not ready yet? Get weekly trivia featuring the Season 50 cast.
          </p>
          {isSubscribed ? (
            <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 px-6 py-4 rounded-xl max-w-lg mx-auto">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">You're subscribed! Check your inbox soon.</span>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="max-w-lg mx-auto">
              <div className="flex gap-3 items-start">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your email"
                  className={`flex-1 px-5 py-3 rounded-xl text-base border ${
                    error ? 'border-red-400' : 'border-gray-300'
                  } focus:border-red-800 focus:outline-none focus:ring-2 focus:ring-red-800/20 transition-all`}
                  disabled={isSubmitting}
                  aria-label="Email address for trivia newsletter"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold text-base transition-all shadow-md hover:shadow-lg whitespace-nowrap flex items-center gap-2 shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing up...</span>
                    </>
                  ) : (
                    'Get Trivia'
                  )}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm mt-2 text-left">{error}</p>}
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Home;
