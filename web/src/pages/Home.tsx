/**
 * Home Page - Main landing page for survivor.realitygamesfantasyleague.com
 *
 * Fantasy Survivor landing with Season 50 signup CTAs and trivia email signup.
 * Optimized layout: trivia capture above the fold, compact design.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '@/components/Footer';
import { CheckCircle, Loader2 } from 'lucide-react';

export function Home() {
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
      {/* Custom Header with Logo */}
      <header className="w-full px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo and Brand Name */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="RGFL" className="h-10 w-auto" />
            <span className="font-display text-xl text-gray-800 hidden sm:inline">
              Reality Games Fantasy League
            </span>
          </Link>

          {/* Auth Links */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm">
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT - Compact, above the fold */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-6 w-full">
        <div className="text-center">
          {/* Trivia Email Capture - NOW FIRST/ABOVE THE FOLD */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white shadow-xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Get Weekly Survivor Trivia</h2>
            <p className="text-purple-100 mb-4 text-sm sm:text-base">
              Test your knowledge with trivia about the Season 50 cast. Free weekly emails!
            </p>
            {isSubscribed ? (
              <div className="flex items-center justify-center gap-2 text-white bg-white/20 px-6 py-3 rounded-xl">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">You're subscribed! Check your inbox soon.</span>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your email"
                    className={`flex-1 px-4 py-3 rounded-xl text-base text-gray-800 border-2 ${
                      error ? 'border-red-400' : 'border-transparent'
                    } focus:border-white focus:outline-none transition-all`}
                    disabled={isSubmitting}
                    aria-label="Email address for trivia newsletter"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="bg-white hover:bg-gray-100 disabled:bg-gray-300 text-purple-700 px-5 py-3 rounded-xl font-bold text-base transition-all whitespace-nowrap flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subscribe'}
                  </button>
                </div>
                {error && <p className="text-red-200 text-sm mt-2 text-left">{error}</p>}
              </form>
            )}
          </div>

          {/* Main Headline */}
          <h1
            className="text-3xl sm:text-4xl md:text-5xl text-gray-900 leading-[0.95] mb-6"
            style={{ fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 400 }}
          >
            Fantasy Survivor
            <br />
            for People Who
            <br />
            <span className="italic text-red-800">Actually</span> Watch
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            100+ scoring rules. Real strategy. No luck required.
            <br />
            Draft your castaways and prove you know the game.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              to="/signup"
              className="bg-red-800 hover:bg-red-900 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              Join Season 50 <span>→</span>
            </Link>
            <Link
              to="/how-to-play"
              className="bg-white hover:bg-gray-50 text-gray-800 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-gray-300 hover:border-gray-400 transition-all shadow-sm"
            >
              How It Works
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
