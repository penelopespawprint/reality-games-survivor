import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Users,
  Target,
  Calendar,
  Zap,
  Shield,
  Award,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock
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

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return { count, start: () => setHasStarted(true), hasStarted };
}

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

// Feature card component
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: number;
}) {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={`group bg-white rounded-2xl p-6 border border-cream-200 shadow-card hover:shadow-elevated transition-all duration-500 cursor-default ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-burgundy-500 group-hover:scale-110 transition-all duration-300">
        <Icon className="h-6 w-6 text-burgundy-600 group-hover:text-white transition-colors duration-300" />
      </div>
      <h3 className="font-display font-bold text-lg text-neutral-800 mb-2 group-hover:text-burgundy-600 transition-colors">
        {title}
      </h3>
      <p className="text-neutral-500 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// Stat counter component
function StatCounter({
  value,
  suffix = '',
  label,
  delay = 0
}: {
  value: number;
  suffix?: string;
  label: string;
  delay?: number;
}) {
  const { ref, isInView } = useInView();
  const { count, start, hasStarted } = useAnimatedCounter(value, 1500);

  useEffect(() => {
    if (isInView && !hasStarted) {
      setTimeout(() => start(), delay);
    }
  }, [isInView, hasStarted, start, delay]);

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-4xl md:text-5xl font-display font-bold text-burgundy-600">
        {count}{suffix}
      </div>
      <p className="text-neutral-600 text-sm mt-2">{label}</p>
    </div>
  );
}

// How it works step component
function HowItWorksStep({
  number,
  title,
  description,
  icon: Icon,
  delay = 0
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  delay?: number;
}) {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={`flex gap-4 transition-all duration-700 ${
        isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-burgundy-500 rounded-full flex items-center justify-center text-white font-display font-bold text-lg">
          {number}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-5 w-5 text-burgundy-500" />
          <h3 className="font-display font-bold text-lg text-neutral-800">{title}</h3>
        </div>
        <p className="text-neutral-500 leading-relaxed">{description}</p>
      </div>
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
      <section ref={heroRef} className="relative overflow-hidden py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className={`transition-all duration-1000 ${heroInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <div className="inline-flex items-center gap-2 bg-burgundy-100 text-burgundy-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Season 50 Registration Open
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-neutral-800 leading-tight tracking-tight mb-4">
                Fantasy Survivor
                <br />
                <span className="text-burgundy-600">For Real Fans</span>
              </h1>

              <p className="text-lg text-neutral-600 leading-relaxed mb-8 max-w-lg">
                Bored of luck-based fantasy leagues? We've created a scoring system with 100+ game-tested rules that reward real strategy. Every vote, idol play, and blindside matters.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="btn btn-primary text-lg px-8 py-4 shadow-float hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 inline-flex items-center gap-2"
                  >
                    Go to Dashboard
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="btn btn-primary text-lg px-8 py-4 shadow-float hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 inline-flex items-center gap-2"
                    >
                      Join Free
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                    <Link
                      to="/how-to-play"
                      className="btn btn-secondary text-lg px-8 py-4 transition-all duration-300 hover:-translate-y-1"
                    >
                      See How It Works
                    </Link>
                  </>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm text-neutral-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Premiere: Feb 25, 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>100% Free to Play</span>
                </div>
              </div>
            </div>

            {/* Right: Logo */}
            <div className={`flex justify-center lg:justify-end transition-all duration-1000 delay-300 ${heroInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              <div className="relative">
                <RGFLLogo className="h-64 sm:h-80 lg:h-96 drop-shadow-2xl" />
                <div className="absolute inset-0 animate-pulse opacity-20">
                  <RGFLLogo className="h-64 sm:h-80 lg:h-96 blur-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-cream-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCounter value={100} suffix="+" label="Scoring Rules" delay={0} />
            <StatCounter value={24} label="Castaways" delay={100} />
            <StatCounter value={13} label="Episodes" delay={200} />
            <StatCounter value={0} suffix="" label="Cost to Play" delay={300} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-neutral-800 mb-4">
              Why RGFL Is Different
            </h2>
            <p className="text-neutral-500 max-w-2xl mx-auto">
              Built by Survivor superfans who've watched every season. We know what makes the game exciting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Target}
              title="100+ Scoring Rules"
              description="Every strategic move counts. Idols, votes, challenges, social plays — we score it all."
              delay={0}
            />
            <FeatureCard
              icon={Users}
              title="Draft Your Dream Team"
              description="Pick 2 castaways in our snake draft. Build your perfect alliance and compete."
              delay={100}
            />
            <FeatureCard
              icon={Calendar}
              title="Weekly Picks"
              description="Choose which castaway to play each episode. Strategy meets prediction every week."
              delay={200}
            />
            <FeatureCard
              icon={Trophy}
              title="Private Leagues"
              description="Create leagues with friends or join the global rankings. Up to 12 players per league."
              delay={300}
            />
            <FeatureCard
              icon={Zap}
              title="Real-Time Scoring"
              description="Watch your points update after each episode. See exactly how you earned every point."
              delay={400}
            />
            <FeatureCard
              icon={Flame}
              title="Built by Superfans"
              description="Created by Survivor obsessives who've analyzed every season to build the perfect game."
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-neutral-800 mb-4">
              How It Works
            </h2>
            <p className="text-neutral-500">
              Get started in minutes. Here's your path to fantasy victory.
            </p>
          </div>

          <div className="space-y-8">
            <HowItWorksStep
              number={1}
              icon={Users}
              title="Create or Join a League"
              description="Start a private league with friends or join an existing one. Free leagues and paid leagues with prize pools available."
              delay={0}
            />
            <HowItWorksStep
              number={2}
              icon={Award}
              title="Draft Your Castaways"
              description="In our snake draft, you'll pick 2 castaways to form your team. Choose wisely — these are your players for the season."
              delay={150}
            />
            <HowItWorksStep
              number={3}
              icon={Target}
              title="Make Weekly Picks"
              description="Each week before the episode, choose which of your castaways to play. Only your picked castaway earns you points."
              delay={300}
            />
            <HowItWorksStep
              number={4}
              icon={TrendingUp}
              title="Watch & Score"
              description="Watch the episode and see your points accumulate. Our 100+ rules capture every strategic moment."
              delay={450}
            />
          </div>

          <div className="text-center mt-12">
            <Link
              to="/how-to-play"
              className="inline-flex items-center gap-2 text-burgundy-600 font-semibold hover:text-burgundy-700 transition-colors"
            >
              Learn more about scoring
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-burgundy-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-white mb-4">
            Ready to Play?
          </h2>
          <p className="text-burgundy-100 text-lg mb-8 max-w-2xl mx-auto">
            Season 50 is the biggest season yet with 18 returning legends. Join now and be ready for the premiere.
          </p>

          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-burgundy-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-cream-50 transition-all duration-300 hover:-translate-y-1 shadow-float"
            >
              Go to Dashboard
              <ChevronRight className="h-5 w-5" />
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-white text-burgundy-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-cream-50 transition-all duration-300 hover:-translate-y-1 shadow-float"
              >
                Sign Up Free
                <ChevronRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-burgundy-600 text-white border-2 border-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-burgundy-400 transition-all duration-300 hover:-translate-y-1"
              >
                Log In
              </Link>
            </div>
          )}
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
              <Link to="/scoring" className="text-neutral-500 hover:text-burgundy-600 transition-colors">
                Scoring Rules
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
