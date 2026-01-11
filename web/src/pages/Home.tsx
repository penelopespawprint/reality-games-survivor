/**
 * Home Page - Main landing page for survivor.realitygamesfantasyleague.com
 *
 * Single-screen landing page for Season 50.
 * Redirects logged-in users to the dashboard.
 */

import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { EditableText } from '@/components/EditableText';
import { Flame, Mail, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { usePageCopy } from '@/lib/useSiteCopy';

export function Home() {
  const { user, loading } = useAuth();
  const [triviaEmail, setTriviaEmail] = useState('');
  const [triviaSubmitting, setTriviaSubmitting] = useState(false);
  const [triviaSuccess, setTriviaSuccess] = useState(false);
  const [triviaError, setTriviaError] = useState('');

  // Fetch site copy from CMS with fallbacks
  const { copy } = usePageCopy('home', {
    'home.hero.badge': 'Season 50 Now Open',
    'home.hero.title': 'Fantasy Survivor for People Who Actually Watch',
    'home.hero.subtitle':
      'Draft castaways. Set weekly lineups. Earn points for every confessional, idol play, and blindside. Prove you know the game.',
    'home.cta.primary': 'Join Free',
    'home.cta.secondary': 'How It Works',
    'home.trivia.heading': 'Sign Up for Free Trivia',
    'home.trivia.description': 'Get access to our 24-question Survivor trivia challenge!',
  });

  // Redirect logged-in users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleTriviaSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triviaEmail || triviaSubmitting) return;

    setTriviaSubmitting(true);
    setTriviaError('');

    try {
      const response = await api<{ success: boolean }>('/trivia/signup', {
        method: 'POST',
        body: JSON.stringify({ email: triviaEmail }),
      });

      if (response.error) {
        setTriviaError(response.error);
      } else {
        setTriviaSuccess(true);
        setTriviaEmail('');
      }
    } catch {
      setTriviaError('Something went wrong. Please try again.');
    } finally {
      setTriviaSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      {/* Navigation */}
      <Navigation />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-burgundy-100 text-burgundy-700 px-3 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Flame className="h-4 w-4" />
            <EditableText copyKey="home.hero.badge" as="span">
              {copy['home.hero.badge']}
            </EditableText>
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

          <EditableText copyKey="home.hero.subtitle" as="p" className="text-lg sm:text-xl text-neutral-600 mb-10 max-w-xl mx-auto">
            {copy['home.hero.subtitle']}
          </EditableText>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Link
              to="/signup"
              className="bg-burgundy-600 hover:bg-burgundy-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Flame className="h-5 w-5" />
              {copy['home.cta.primary']}
            </Link>
            <Link
              to="/how-to-play"
              className="bg-white hover:bg-cream-100 text-neutral-800 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-cream-200 hover:border-cream-300 transition-all inline-flex items-center justify-center w-full sm:w-auto"
            >
              {copy['home.cta.secondary']}
            </Link>
          </div>

          {/* Trivia Email Signup */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Mail className="h-5 w-5 text-burgundy-600" />
              <EditableText copyKey="home.trivia.heading" as="h3" className="font-semibold text-neutral-800">
                {copy['home.trivia.heading']}
              </EditableText>
            </div>
            <EditableText copyKey="home.trivia.description" as="p" className="text-sm text-neutral-600 mb-4">
              {copy['home.trivia.description']}
            </EditableText>

            {triviaSuccess ? (
              <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">You're signed up! Check your email.</span>
              </div>
            ) : (
              <form onSubmit={handleTriviaSignup} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={triviaEmail}
                  onChange={(e) => setTriviaEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-3 rounded-lg border border-cream-200 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={triviaSubmitting || !triviaEmail}
                  className="bg-burgundy-600 hover:bg-burgundy-700 disabled:bg-burgundy-400 text-white px-6 py-3 rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2"
                >
                  {triviaSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign Up'}
                </button>
              </form>
            )}

            {triviaError && <p className="text-red-600 text-sm mt-2">{triviaError}</p>}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Home;
