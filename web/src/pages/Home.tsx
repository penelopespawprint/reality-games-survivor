import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';

// Torch SVG component - extracted/inspired from Survivor torch imagery
function TorchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Flame */}
      <path
        d="M32 0C32 0 18 20 18 35C18 45 24 52 32 55C40 52 46 45 46 35C46 20 32 0 32 0Z"
        fill="url(#flame-gradient)"
      />
      <path
        d="M32 8C32 8 24 22 24 32C24 38 27 43 32 45C37 43 40 38 40 32C40 22 32 8 32 8Z"
        fill="#FFD700"
        opacity="0.8"
      />
      {/* Torch handle */}
      <rect x="28" y="50" width="8" height="140" fill="url(#wood-gradient)" rx="2" />
      {/* Wrap details */}
      <rect x="26" y="55" width="12" height="4" fill="#5C3317" rx="1" />
      <rect x="26" y="62" width="12" height="4" fill="#5C3317" rx="1" />
      <rect x="26" y="69" width="12" height="4" fill="#5C3317" rx="1" />
      <defs>
        <linearGradient id="flame-gradient" x1="32" y1="0" x2="32" y2="55" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B00" />
          <stop offset="0.5" stopColor="#FF4500" />
          <stop offset="1" stopColor="#A52A2A" />
        </linearGradient>
        <linearGradient id="wood-gradient" x1="28" y1="50" x2="36" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B4513" />
          <stop offset="0.5" stopColor="#A0522D" />
          <stop offset="1" stopColor="#8B4513" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Home() {
  const { user } = useAuth();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-cream-100 to-cream-200 overflow-hidden">
      <Navigation />

      {/* Hero - fills remaining viewport */}
      <div className="flex-1 flex items-center justify-center relative px-4">
        {/* Subtle radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-cream-300/30 pointer-events-none" />

        {/* Decorative torches on sides */}
        <div className="absolute left-12 top-1/2 -translate-y-1/2 opacity-10 hidden xl:block">
          <TorchIcon className="h-72" />
        </div>
        <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-10 hidden xl:block">
          <TorchIcon className="h-72" />
        </div>

        <div className="max-w-3xl text-center relative z-10 animate-fade-in">
          {/* Main torch accent */}
          <div className="flex justify-center mb-8">
            <TorchIcon className="h-24 drop-shadow-lg" />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-neutral-800 leading-tight tracking-tight">
            SURVIVOR FANTASY LEAGUE
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Bored of the same old fantasy leagues where you pick one Survivor and pray for luck?
          </p>

          <p className="mt-4 text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            We've created a scoring system with{' '}
            <span className="font-semibold text-burgundy-500">100+ game-tested rules</span>{' '}
            that reward real strategy, not just luck.
          </p>

          <div className="mt-10">
            {user ? (
              <Link
                to="/dashboard"
                className="btn btn-primary text-lg px-12 py-4 shadow-float hover:shadow-elevated-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/signup"
                className="btn btn-primary text-lg px-12 py-4 shadow-float hover:shadow-elevated-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                JOIN NOW
              </Link>
            )}
          </div>

          <p className="mt-8 text-sm text-neutral-500 tracking-wide">
            <span className="font-medium">Survivor Season 50: In the Hands of the Fans</span> — Registration opens December 19, 2025
          </p>
        </div>
      </div>

      {/* Minimal footer */}
      <footer className="py-4 text-center text-neutral-400 text-sm border-t border-cream-200/50 bg-white/30">
        © 2025 Reality Games Fantasy League · Not affiliated with CBS or Survivor
      </footer>
    </div>
  );
}
