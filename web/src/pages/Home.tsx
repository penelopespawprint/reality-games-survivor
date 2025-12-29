/**
 * Home Page - Main landing page for survivor.realitygamesfantasyleague.com
 *
 * Fantasy Survivor landing with Season 50 signup CTAs and trivia email signup.
 */

import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

export function Home() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #F5F0E8 0%, #E8E0D5 50%, #DED4C4 100%)' }}
    >
      {/* Navigation */}
      <Navigation />

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-8">
            <img
              src="/logo.png"
              alt="Reality Games Fantasy League"
              className="h-20 w-auto mx-auto"
            />
          </div>

          <h1
            className="text-6xl sm:text-7xl md:text-8xl text-gray-900 leading-[0.95] mb-10"
            style={{ fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 400 }}
          >
            Fantasy Survivor
            <br />
            for People Who
            <br />
            <span className="italic text-red-800">Actually</span> Watch
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-12 leading-relaxed max-w-2xl mx-auto">
            100+ scoring rules. Real strategy. No luck required.
            <br />
            Draft your castaways and prove you know the game.
          </p>

          {/* Dual CTAs - Equal Weight */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              to="/signup"
              className="bg-red-800 hover:bg-red-900 text-white px-10 py-5 rounded-xl font-semibold text-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              Join Season 50 <span>→</span>
            </Link>
            <Link
              to="/how-to-play"
              className="bg-white hover:bg-gray-50 text-gray-800 px-10 py-5 rounded-xl font-semibold text-xl border-2 border-gray-300 hover:border-gray-400 transition-all shadow-sm"
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
          <div className="flex gap-3 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-5 py-3 rounded-xl text-base border border-gray-300 focus:border-red-800 focus:outline-none focus:ring-2 focus:ring-red-800/20 transition-all"
            />
            <button className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold text-base transition-all shadow-md hover:shadow-lg whitespace-nowrap">
              Get Trivia
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Home;
