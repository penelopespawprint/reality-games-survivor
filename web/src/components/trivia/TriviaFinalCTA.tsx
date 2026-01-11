/**
 * Final CTA Section for Trivia Page
 */
import { Link } from 'react-router-dom';
import { AnimatedTorch } from './AnimatedTorch';
import { CountdownTimer } from './CountdownTimer';

interface TriviaFinalCTAProps {
  user: { id: string; email?: string } | null;
}

export function TriviaFinalCTA({ user }: TriviaFinalCTAProps) {
  return (
    <section
      className="relative py-32 md:py-40 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #E8E0D5 0%, #F5F0E8 100%)',
      }}
    >
      {/* Decorative torches */}
      <div className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 opacity-30">
        <AnimatedTorch size="small" />
      </div>
      <div className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 opacity-30">
        <AnimatedTorch size="small" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center max-w-2xl">
        {/* Main headline */}
        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
          So, are you a <span className="text-burgundy-500">TRUE</span> Survivor fan?
        </h2>

        <p className="text-xl text-neutral-600 mb-10 leading-relaxed">
          You've proven you know the game.
          <br />
          Now it's time to play it.
        </p>

        {/* CTA */}
        <Link
          to={user ? '/dashboard' : '/signup'}
          className="inline-flex items-center gap-2 px-10 py-5 bg-burgundy-500 text-white font-display text-lg font-bold rounded-lg hover:bg-burgundy-600 transition-all shadow-xl shadow-burgundy-500/30"
        >
          Join Us for Season 50
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </Link>

        {/* Season info */}
        <div className="mt-12">
          <p className="text-neutral-500 mb-4">Season 50 premieres February 26, 2026</p>
          <p className="text-sm text-neutral-400 mb-4">Registration closes:</p>
          <CountdownTimer />
        </div>
      </div>
    </section>
  );
}
