import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Users,
  Target,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// Check if we're on the main domain (splash page) or survivor subdomain (full app)
const isMainDomain = () => {
  const hostname = window.location.hostname;
  return hostname === 'realitygamesfantasyleague.com' ||
         hostname === 'www.realitygamesfantasyleague.com';
};

// Check if we're on the shortlink domain - redirect to survivor app
const isShortlink = () => {
  const hostname = window.location.hostname;
  return hostname === 'rgfl.app' || hostname === 'www.rgfl.app';
};

const SURVIVOR_APP_URL = 'https://survivor.realitygamesfantasyleague.com';

// Intersection observer hook for scroll animations
function useInView(threshold = 0.1) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return { ref: setRef, isInView };
}

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

// Step card component for the three steps section
function StepCard({
  icon: Icon,
  title,
  desc,
  color,
  delay
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
  delay: number;
}) {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={`group text-center p-8 rounded-2xl bg-cream-50 border-2 border-cream-200 hover:bg-white transition-all duration-500 cursor-default ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ${
        color === 'burgundy' ? 'bg-burgundy-100' : color === 'orange' ? 'bg-orange-100' : 'bg-amber-100'
      }`}>
        <Icon className={`h-10 w-10 ${
          color === 'burgundy' ? 'text-burgundy-500' : color === 'orange' ? 'text-orange-500' : 'text-amber-500'
        }`} />
      </div>
      <h3 className="font-display text-2xl font-bold text-neutral-800 mb-2">{title}</h3>
      <p className="text-neutral-500">{desc}</p>
    </div>
  );
}

// Splash page for main domain (realitygamesfantasyleague.com)
function SplashPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 py-16 lg:py-24">
          <div className="text-center">
            {/* Logo with pulse animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <RGFLLogo className="h-40 sm:h-48 drop-shadow-xl animate-fade-in" />
                <div className="absolute inset-0 animate-pulse opacity-30">
                  <RGFLLogo className="h-40 sm:h-48 blur-xl" />
                </div>
              </div>
            </div>

            {/* Brand Name */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-neutral-800 leading-tight tracking-tight mb-2 animate-fade-in">
              REALITY GAMES
              <br />
              <span className="text-burgundy-600">FANTASY LEAGUE</span>
            </h1>

            {/* Tagline */}
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in" style={{ animationDelay: '200ms' }}>
              Fantasy leagues built by superfans, for superfans.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
              <a
                href={SURVIVOR_APP_URL}
                className="btn btn-primary text-lg px-10 py-4 shadow-float hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
              >
                Join Survivor Season 50
              </a>
              <a
                href={`${SURVIVOR_APP_URL}/how-to-play`}
                className="btn btn-secondary text-lg px-10 py-4 transition-all duration-300 hover:-translate-y-1"
              >
                How It Works
              </a>
            </div>

            <p className="text-sm text-neutral-500 animate-fade-in" style={{ animationDelay: '600ms' }}>
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
  const { ref: heroRef, isInView: heroInView } = useInView();

  return (
    <div className="min-h-screen bg-cream-50">
      <Navigation />

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className={`transition-all duration-1000 ${heroInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <div className="inline-flex items-center gap-2 bg-burgundy-100 text-burgundy-700 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
                <Sparkles className="h-4 w-4" />
                Season 50 Now Open
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-neutral-800 leading-tight tracking-tight mb-6">
                Fantasy Survivor
                <br />
                <span className="text-burgundy-600">Built for Superfans</span>
              </h1>

              <p className="text-xl text-neutral-600 leading-relaxed mb-8 max-w-lg">
                Draft. Pick. Dominate.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="btn btn-primary text-lg px-10 py-4 shadow-float hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 hover:scale-105 inline-flex items-center gap-2"
                  >
                    Go to Dashboard
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="btn btn-primary text-lg px-10 py-4 shadow-float hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 hover:scale-105 inline-flex items-center gap-2"
                    >
                      Join Free
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                    <Link
                      to="/how-to-play"
                      className="btn btn-secondary text-lg px-10 py-4 transition-all duration-300 hover:-translate-y-1"
                    >
                      How It Works
                    </Link>
                  </>
                )}
              </div>

              <p className="text-sm text-neutral-400">
                Premiere: February 25, 2026 • Free to play
              </p>
            </div>

            {/* Right: Logo with glow effect */}
            <div className={`flex justify-center lg:justify-end transition-all duration-1000 delay-300 ${heroInView ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-12 scale-95'}`}>
              <div className="relative group">
                <RGFLLogo className="h-64 sm:h-80 lg:h-96 drop-shadow-2xl transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 animate-pulse opacity-30">
                  <RGFLLogo className="h-64 sm:h-80 lg:h-96 blur-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-neutral-800 mb-2">
              Three Steps to Victory
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard icon={Users} title="Draft" desc="Pick 2 castaways" color="burgundy" delay={0} />
            <StepCard icon={Target} title="Pick" desc="Choose weekly" color="orange" delay={150} />
            <StepCard icon={Trophy} title="Win" desc="Climb the ranks" color="amber" delay={300} />
          </div>
        </div>
      </section>

      {/* Season 50 CTA */}
      <section className="py-16 bg-gradient-to-br from-burgundy-500 to-burgundy-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Flame className="h-4 w-4 animate-pulse" />
            Season 50: In the Hands of the Fans
          </div>

          <h2 className="font-display text-3xl sm:text-4xl text-white mb-6">
            18 Legends. One Winner.
          </h2>

          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-burgundy-600 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-cream-50 transition-all duration-300 hover:-translate-y-1 hover:scale-105 shadow-float"
            >
              View Your Leagues
              <ChevronRight className="h-5 w-5" />
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-white text-burgundy-600 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-cream-50 transition-all duration-300 hover:-translate-y-1 hover:scale-105 shadow-float"
              >
                Join Now — It's Free
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
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
