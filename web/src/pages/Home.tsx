import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';

// Check if we're on the main domain (splash page) or survivor subdomain (full app)
const isMainDomain = () => {
  const hostname = window.location.hostname;
  // Main domain: realitygamesfantasyleague.com (no subdomain)
  // Survivor app: survivor.realitygamesfantasyleague.com
  return hostname === 'realitygamesfantasyleague.com' ||
         hostname === 'www.realitygamesfantasyleague.com';
};

// Check if we're on the shortlink domain - redirect to survivor app
const isShortlink = () => {
  const hostname = window.location.hostname;
  return hostname === 'rgfl.app' || hostname === 'www.rgfl.app';
};

const SURVIVOR_APP_URL = 'https://survivor.realitygamesfantasyleague.com';

// RGFL Logo with Torch
function RGFLLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Flame */}
      <path
        d="M100 0C100 0 60 50 60 90C60 115 75 135 100 145C125 135 140 115 140 90C140 50 100 0 100 0Z"
        fill="url(#flame-gradient-logo)"
      />
      <path
        d="M100 20C100 20 75 55 75 80C75 95 85 108 100 115C115 108 125 95 125 80C125 55 100 20 100 20Z"
        fill="#FFD700"
        opacity="0.8"
      />
      {/* Inner flame glow */}
      <path
        d="M100 40C100 40 88 60 88 75C88 83 93 90 100 93C107 90 112 83 112 75C112 60 100 40 100 40Z"
        fill="#FFF5CC"
        opacity="0.6"
      />
      {/* Torch handle */}
      <rect x="90" y="140" width="20" height="120" fill="url(#wood-gradient-logo)" rx="4" />
      {/* Wrap details */}
      <rect x="85" y="148" width="30" height="8" fill="#5C3317" rx="2" />
      <rect x="85" y="162" width="30" height="8" fill="#5C3317" rx="2" />
      <rect x="85" y="176" width="30" height="8" fill="#5C3317" rx="2" />
      <defs>
        <linearGradient id="flame-gradient-logo" x1="100" y1="0" x2="100" y2="145" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B00" />
          <stop offset="0.5" stopColor="#FF4500" />
          <stop offset="1" stopColor="#A52A2A" />
        </linearGradient>
        <linearGradient id="wood-gradient-logo" x1="90" y1="140" x2="110" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B4513" />
          <stop offset="0.5" stopColor="#A0522D" />
          <stop offset="1" stopColor="#8B4513" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Splash page for main domain (realitygamesfantasyleague.com)
function SplashPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-orange-100/30 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 py-16 lg:py-24">
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <RGFLLogo className="h-40 sm:h-48 drop-shadow-xl" />
            </div>

            {/* Brand Name */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-neutral-800 leading-tight tracking-tight mb-2">
              REALITY GAMES
              <br />
              <span className="text-burgundy-600">FANTASY LEAGUE</span>
            </h1>

            {/* Tagline */}
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
              Fantasy leagues built by superfans, for superfans.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <a
                href={SURVIVOR_APP_URL}
                className="btn btn-primary text-lg px-10 py-4 shadow-float hover:shadow-elevated-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                Join Survivor Season 50
              </a>
              <a
                href={`${SURVIVOR_APP_URL}/how-to-play`}
                className="btn btn-secondary text-lg px-10 py-4 transition-all duration-300 hover:-translate-y-0.5"
              >
                How It Works
              </a>
            </div>

            <p className="text-sm text-neutral-500">
              Premiere: February 25, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-cream-100 border-t border-cream-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-neutral-400 text-sm">
              © 2025 Reality Games Fantasy League. Not affiliated with CBS or Survivor.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a href={`${SURVIVOR_APP_URL}/login`} className="text-neutral-500 hover:text-burgundy-600 transition-colors">
                Log In
              </a>
              <a href={`${SURVIVOR_APP_URL}/contact`} className="text-neutral-500 hover:text-burgundy-600 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Full app home page for survivor subdomain
function SurvivorHome() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-orange-100/30 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 py-16 lg:py-24">
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <RGFLLogo className="h-40 sm:h-48 drop-shadow-xl" />
            </div>

            {/* Season Title */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-neutral-800 leading-tight tracking-tight mb-2">
              SURVIVOR SEASON 50
            </h1>
            <p className="text-xl sm:text-2xl text-burgundy-600 font-display mb-6">
              In the Hands of the Fans
            </p>

            <p className="text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
              100+ scoring rules that reward real strategy. Draft your team, make weekly picks, and compete with friends.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              {user ? (
                <Link
                  to="/dashboard"
                  className="btn btn-primary text-lg px-10 py-4 shadow-float hover:shadow-elevated-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="btn btn-primary text-lg px-10 py-4 shadow-float hover:shadow-elevated-lg transition-all duration-300 hover:-translate-y-0.5"
                  >
                    Join Now
                  </Link>
                  <Link
                    to="/how-to-play"
                    className="btn btn-secondary text-lg px-10 py-4 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    How It Works
                  </Link>
                </>
              )}
            </div>

            <p className="text-sm text-neutral-500">
              Premiere: February 25, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-cream-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-display font-bold text-burgundy-600">100+</div>
              <p className="text-neutral-600 text-sm mt-1">Scoring Rules</p>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-burgundy-600">18</div>
              <p className="text-neutral-600 text-sm mt-1">Castaways</p>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-burgundy-600">13</div>
              <p className="text-neutral-600 text-sm mt-1">Episodes</p>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-burgundy-600">Free</div>
              <p className="text-neutral-600 text-sm mt-1">To Play</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-cream-100 border-t border-cream-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-neutral-400 text-sm">
              © 2025 Reality Games Fantasy League. Not affiliated with CBS or Survivor.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/how-to-play" className="text-neutral-500 hover:text-burgundy-600 transition-colors">
                How to Play
              </Link>
              <Link to="/contact" className="text-neutral-500 hover:text-burgundy-600 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Home() {
  // Redirect shortlink to survivor app (preserves path)
  if (isShortlink()) {
    window.location.href = SURVIVOR_APP_URL + window.location.pathname;
    return null;
  }

  // Show splash page on main domain, full app on survivor subdomain
  if (isMainDomain()) {
    return <SplashPage />;
  }

  return <SurvivorHome />;
}
