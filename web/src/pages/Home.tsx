import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

const isMainDomain = () => {
  const hostname = window.location.hostname;
  return (
    hostname === 'realitygamesfantasyleague.com' || hostname === 'www.realitygamesfantasyleague.com'
  );
};

const isShortlink = () => {
  const hostname = window.location.hostname;
  return hostname === 'rgfl.app' || hostname === 'www.rgfl.app';
};

const SURVIVOR_APP_URL = 'https://survivor.realitygamesfantasyleague.com';

// ============================================================================
// CONCEPT A: "Logo Hero" - Logo front and center, content below
// Clean, logo dominates, text appears on scroll or after delay
// ============================================================================

function ConceptA() {
  const { user } = useAuth();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Staggered reveal
    const t1 = setTimeout(() => setStage(1), 300);
    const t2 = setTimeout(() => setStage(2), 800);
    const t3 = setTimeout(() => setStage(3), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          {/* Logo - Hero element */}
          <div
            className={`mb-10 transition-all duration-1000 ${
              stage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <img
              src="/logo.png"
              alt="Reality Games Fantasy League"
              className="h-40 sm:h-52 lg:h-64 mx-auto"
            />
          </div>

          {/* Tagline */}
          <p
            className={`font-display text-2xl sm:text-3xl text-neutral-800 mb-8 transition-all duration-700 ${
              stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Fantasy Survivor for <span className="text-burgundy-600">strategists.</span>
          </p>

          {/* Copy */}
          <div
            className={`space-y-4 text-neutral-600 leading-relaxed mb-10 transition-all duration-700 ${
              stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {!user && (
              <>
                <p>100+ scoring rules. Every vote, idol, and blindside counts.</p>
                <p className="text-neutral-500">Built by superfans, for superfans.</p>
              </>
            )}
            {user && <p>Welcome back. Your leagues await.</p>}
          </div>

          {/* CTA */}
          <div
            className={`transition-all duration-700 delay-100 ${
              stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="group inline-flex items-center gap-3 bg-burgundy-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-burgundy-700 transition-all"
            >
              {user ? 'Dashboard' : 'Join Season 50'}
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            {!user && (
              <p className="text-neutral-400 text-sm mt-6">
                <Link to="/login" className="text-burgundy-600 hover:underline">
                  Log in
                </Link>
                {' · '}
                <Link to="/how-to-play" className="hover:text-neutral-600">
                  How it works
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============================================================================
// CONCEPT B: "The Torch Reveal" - Animated torch that glows/pulses
// Torch element separates and becomes the focal point with flame animation
// ============================================================================

function ConceptB() {
  const { user } = useAuth();
  const [flameIntensity, setFlameIntensity] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Torch "ignites" then content reveals
    const t1 = setTimeout(() => setFlameIntensity(1), 500);
    const t2 = setTimeout(() => setShowContent(true), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col overflow-hidden">
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-6 py-16 relative">
        {/* Ambient glow from torch */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, rgba(255, 140, 0, ${0.15 * flameIntensity}) 0%, transparent 60%)`,
            filter: 'blur(40px)',
          }}
        />

        <div className="relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
          {/* Left: Torch visualization */}
          <div className="flex justify-center lg:justify-end order-1 lg:order-1">
            <div className="relative">
              {/* Torch glow backdrop */}
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full transition-all duration-1000 ${
                  flameIntensity > 0 ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  background: 'radial-gradient(circle, rgba(255, 120, 0, 0.4) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                  animation: flameIntensity > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                }}
              />

              {/* Stylized torch flame */}
              <div className="relative">
                {/* Outer flame */}
                <div
                  className={`w-20 h-32 mx-auto transition-all duration-700 ${
                    flameIntensity > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}
                  style={{
                    background:
                      'linear-gradient(to top, #B22222 0%, #FF6B00 40%, #FFD700 70%, #FFFACD 100%)',
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                    animation:
                      flameIntensity > 0 ? 'flicker 0.5s ease-in-out infinite alternate' : 'none',
                  }}
                />

                {/* Inner bright core */}
                <div
                  className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-16 transition-all duration-700 delay-200 ${
                    flameIntensity > 0 ? 'opacity-90 scale-100' : 'opacity-0 scale-75'
                  }`}
                  style={{
                    background: 'linear-gradient(to top, #FFA500 0%, #FFD700 50%, #FFFFFF 100%)',
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  }}
                />

                {/* Torch handle */}
                <div className="w-8 h-24 mx-auto bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 rounded-b-lg" />
              </div>

              {/* Season 50 text wrapping around torch */}
              <div
                className={`absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-700 delay-500 ${
                  flameIntensity > 0 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <span className="text-amber-400/80 text-xs tracking-[0.3em] uppercase font-medium">
                  Season 50
                </span>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div
            className={`text-center lg:text-left order-2 lg:order-2 transition-all duration-700 ${
              showContent ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6">
              Survivor Fantasy
              <br />
              <span className="text-amber-400">for strategists.</span>
            </h1>

            {!user && (
              <div className="space-y-4 text-neutral-400 leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
                <p>Bored of picking one Survivor and praying for luck?</p>
                <p>
                  100+ scoring rules reward real strategy. Every vote, idol, and blindside counts.
                </p>
              </div>
            )}

            {user && <p className="text-xl text-neutral-400 mb-10">Your leagues are waiting.</p>}

            <Link
              to={user ? '/dashboard' : '/signup'}
              className="group inline-flex items-center gap-3 bg-amber-500 text-neutral-900 px-8 py-4 rounded-xl font-semibold hover:bg-amber-400 transition-all"
            >
              {user ? 'Dashboard' : 'Join Now'}
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            {!user && (
              <p className="text-neutral-500 text-sm mt-6">
                <Link to="/login" className="text-amber-400 hover:underline">
                  Log in
                </Link>
                {' · '}
                <Link to="/how-to-play" className="hover:text-neutral-400">
                  How it works
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Keyframes for animations */}
      <style>{`
        @keyframes flicker {
          0% { transform: scaleY(1) scaleX(1); }
          100% { transform: scaleY(1.05) scaleX(0.97); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, 0) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, 0) scale(1.1); }
        }
      `}</style>

      <Footer />
    </div>
  );
}

// ============================================================================
// CONCEPT C: "Type Play" - Creative typography for SURVIVOR SEASON 50
// Letters animate in, season number has special treatment
// ============================================================================

function ConceptC() {
  const { user } = useAuth();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 600);
    const t3 = setTimeout(() => setStage(3), 1100);
    const t4 = setTimeout(() => setStage(4), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Typography hero */}
          <div className="mb-12">
            {/* SURVIVOR - staggered letter reveal */}
            <div className="overflow-hidden mb-2">
              <h1
                className={`font-display text-5xl sm:text-7xl lg:text-8xl text-neutral-900 tracking-tight transition-all duration-700 ${
                  stage >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                }`}
              >
                SURVIVOR
              </h1>
            </div>

            {/* SEASON 50 - special treatment */}
            <div className="flex items-center justify-center gap-4">
              <span
                className={`w-12 h-px bg-burgundy-400 transition-all duration-500 ${
                  stage >= 2 ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                }`}
                style={{ transformOrigin: 'right' }}
              />

              <span
                className={`font-display text-2xl sm:text-3xl text-burgundy-600 tracking-widest transition-all duration-700 ${
                  stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                SEASON
              </span>

              {/* 50 with special emphasis */}
              <span
                className={`font-display text-4xl sm:text-5xl lg:text-6xl text-burgundy-600 transition-all duration-700 delay-100 ${
                  stage >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`}
              >
                50
              </span>

              <span
                className={`w-12 h-px bg-burgundy-400 transition-all duration-500 ${
                  stage >= 2 ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                }`}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          </div>

          {/* Subtitle */}
          <p
            className={`font-display text-xl sm:text-2xl text-neutral-700 mb-8 transition-all duration-700 ${
              stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Fantasy League for <span className="text-burgundy-600">Superfans</span>
          </p>

          {/* Copy */}
          <div
            className={`max-w-xl mx-auto space-y-4 text-neutral-600 leading-relaxed mb-10 transition-all duration-700 ${
              stage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {!user && (
              <p>
                100+ scoring rules that reward real strategy. Every vote, idol play, and blindside
                can earn or cost you points.
              </p>
            )}
            {user && <p>Welcome back. Your leagues are waiting.</p>}
          </div>

          {/* CTA */}
          <div
            className={`transition-all duration-700 ${
              stage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="group inline-flex items-center gap-3 bg-burgundy-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-burgundy-700 transition-all"
            >
              {user ? 'Dashboard' : 'Join Now'}
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            {!user && (
              <p className="text-neutral-400 text-sm mt-6">
                <Link to="/login" className="text-burgundy-600 hover:underline">
                  Log in
                </Link>
                {' · '}
                <Link to="/how-to-play" className="hover:text-neutral-600">
                  How it works
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============================================================================
// CONCEPT D: "Scoreboard" - Fantasy sports scoreboard aesthetic
// Counter animations, dark theme with accent colors, stats-forward
// ============================================================================

function ConceptD() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Animate counter from 0 to 100
    const duration = 1500;
    const steps = 60;
    const increment = 100 / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        setCount(100);
        clearInterval(timer);
        setTimeout(() => setRevealed(true), 300);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-3xl mx-auto">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="Reality Games Fantasy League"
            className={`h-24 sm:h-32 mx-auto mb-12 transition-all duration-700 ${
              revealed ? 'opacity-100' : 'opacity-50'
            }`}
          />

          {/* Stats counter */}
          <div className="mb-10">
            <div className="inline-flex items-baseline gap-2 mb-4">
              <span
                className="font-display text-7xl sm:text-8xl lg:text-9xl text-burgundy-500 tabular-nums"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {count}+
              </span>
            </div>
            <p className="text-2xl sm:text-3xl text-neutral-400 font-display tracking-wide">
              SCORING RULES
            </p>
          </div>

          {/* Divider */}
          <div
            className={`w-32 h-px bg-gradient-to-r from-transparent via-burgundy-600 to-transparent mx-auto mb-10 transition-all duration-700 ${
              revealed ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
            }`}
          />

          {/* Copy */}
          <div
            className={`space-y-4 text-neutral-400 text-lg leading-relaxed mb-10 transition-all duration-500 ${
              revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {!user && (
              <>
                <p>Every vote, idol, and blindside counts.</p>
                <p className="text-neutral-500">Real strategy. No luck required.</p>
              </>
            )}
            {user && <p>Your leagues are waiting.</p>}
          </div>

          {/* CTA */}
          <div
            className={`transition-all duration-500 delay-200 ${
              revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="group inline-flex items-center gap-3 bg-burgundy-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-burgundy-500 transition-all"
            >
              {user ? 'Dashboard' : 'Join Season 50'}
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            {!user && (
              <p className="text-neutral-500 text-sm mt-6">
                <Link to="/login" className="text-burgundy-400 hover:underline">
                  Log in
                </Link>
                {' · '}
                <Link to="/how-to-play" className="hover:text-neutral-400">
                  How it works
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============================================================================
// CONCEPT E: "The Glow" - Subtle ambient fire glow effect
// Warm gradient background that shifts, minimalist content
// ============================================================================

function ConceptE() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    setTimeout(() => setLoaded(true), 200);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      onMouseMove={handleMouseMove}
      style={{
        background: `radial-gradient(ellipse at ${mousePos.x}% ${mousePos.y}%, rgba(139, 69, 19, 0.15) 0%, rgba(20, 20, 20, 1) 50%)`,
        transition: 'background 0.3s ease-out',
      }}
    >
      <Navigation />

      {/* Ambient glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255, 140, 50, 0.08) 0%, transparent 40%)`,
          transition: 'background 0.3s ease-out',
        }}
      />

      <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <div className="text-center max-w-2xl mx-auto">
          {/* Logo with glow */}
          <div className="relative inline-block mb-10">
            <img
              src="/logo.png"
              alt="Reality Games Fantasy League"
              className={`h-32 sm:h-40 lg:h-48 mx-auto relative z-10 transition-all duration-1000 ${
                loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            />
            {/* Logo glow */}
            <div
              className={`absolute inset-0 blur-2xl transition-opacity duration-1000 ${
                loaded ? 'opacity-40' : 'opacity-0'
              }`}
              style={{
                background: 'radial-gradient(circle, rgba(255, 120, 50, 0.6) 0%, transparent 70%)',
              }}
            />
          </div>

          {/* Title */}
          <h1
            className={`font-display text-3xl sm:text-4xl lg:text-5xl text-white mb-6 transition-all duration-700 delay-300 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Survivor Fantasy League
          </h1>

          {/* Tagline */}
          <p
            className={`text-xl text-amber-200/70 mb-8 transition-all duration-700 delay-500 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Season 50
          </p>

          {/* Copy */}
          <div
            className={`space-y-3 text-neutral-400 leading-relaxed mb-10 transition-all duration-700 delay-700 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {!user && (
              <>
                <p>100+ scoring rules that reward real strategy.</p>
                <p className="text-neutral-500">Built by superfans, for superfans.</p>
              </>
            )}
            {user && <p>Your leagues await.</p>}
          </div>

          {/* CTA */}
          <div
            className={`transition-all duration-700 delay-900 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="group inline-flex items-center gap-3 bg-amber-600/90 backdrop-blur text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-amber-500 transition-all border border-amber-500/30"
            >
              {user ? 'Dashboard' : 'Join Now'}
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            {!user && (
              <p className="text-neutral-500 text-sm mt-6">
                <Link to="/login" className="text-amber-400/80 hover:text-amber-400">
                  Log in
                </Link>
                {' · '}
                <Link to="/how-to-play" className="hover:text-neutral-400">
                  How it works
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============================================================================
// CONCEPT F: "Bold Statement" - Large statement typography, minimal
// One big message, clear hierarchy, cream theme
// ============================================================================

function ConceptF() {
  const { user } = useAuth();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 200);
    const t2 = setTimeout(() => setStage(2), 600);
    const t3 = setTimeout(() => setStage(3), 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navigation />

      <main className="flex-1 flex items-center px-6 py-16">
        <div className="max-w-5xl mx-auto w-full">
          {/* Left-aligned bold statement */}
          <div className="max-w-3xl">
            <p
              className={`text-burgundy-600 font-medium tracking-wide uppercase text-sm mb-6 transition-all duration-500 ${
                stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Season 50 · Fantasy League
            </p>

            <h1
              className={`font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-neutral-900 leading-[1.1] mb-8 transition-all duration-700 ${
                stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              {!user ? (
                <>
                  Survivor Fantasy
                  <br />
                  for people who
                  <br />
                  <span className="text-burgundy-600">actually watch</span> Survivor.
                </>
              ) : (
                <>
                  Welcome back.
                  <br />
                  <span className="text-burgundy-600">Your move.</span>
                </>
              )}
            </h1>

            <p
              className={`text-lg sm:text-xl text-neutral-600 max-w-xl leading-relaxed mb-10 transition-all duration-700 delay-100 ${
                stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {!user
                ? '100+ scoring rules. Every vote, idol, and blindside counts. No luck required.'
                : 'Your leagues are waiting.'}
            </p>

            <div
              className={`flex flex-wrap items-center gap-4 transition-all duration-700 delay-200 ${
                stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Link
                to={user ? '/dashboard' : '/signup'}
                className="group inline-flex items-center gap-3 bg-burgundy-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-burgundy-700 transition-all"
              >
                {user ? 'Dashboard' : 'Join Now'}
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              {!user && (
                <>
                  <Link
                    to="/login"
                    className="px-6 py-4 text-burgundy-600 font-medium hover:text-burgundy-700 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/how-to-play"
                    className="text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    How it works →
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============================================================================
// SPLASH PAGE (Main Domain) - Parchment with Parallax
// ============================================================================

function SplashPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Parchment background texture */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            linear-gradient(90deg, rgba(139, 69, 19, 0.03) 0%, transparent 50%, rgba(139, 69, 19, 0.03) 100%),
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 69, 19, 0.05) 2px, rgba(139, 69, 19, 0.05) 4px),
            radial-gradient(circle at 20% 50%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
            #f5f1e8
          `,
          backgroundSize: '100% 100%, 100% 8px, 100% 100%, 100% 100%, 100% 100%',
        }}
      />

      {/* Parallax layers */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          transform: `translateY(${scrollY * 0.3}px)`,
          background:
            'radial-gradient(circle at 30% 40%, rgba(184, 134, 11, 0.15) 0%, transparent 50%)',
        }}
      />
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          transform: `translateY(${scrollY * 0.5}px)`,
          background:
            'radial-gradient(circle at 70% 60%, rgba(139, 69, 19, 0.1) 0%, transparent 50%)',
        }}
      />

      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Big Logo */}
          <img
            src="/logo.png"
            alt="Reality Games Fantasy League"
            className="h-64 sm:h-80 lg:h-96 mx-auto mb-8 drop-shadow-lg"
          />

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <p className="text-burgundy-700 text-sm italic mb-2">Scroll to learn more</p>
            <div className="w-6 h-6 border-r-2 border-b-2 border-burgundy-700 rotate-45 mx-auto" />
          </div>
        </div>
      </main>

      {/* Content sections that appear on scroll */}
      <div className="relative z-10 bg-[#f5f1e8]/80 backdrop-blur-sm">
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-4xl font-display font-bold text-burgundy-800 mb-6">
            Season 50: In the Hands of the Fans
          </h2>
          <p className="text-xl text-neutral-700 leading-relaxed mb-8">
            Fantasy Survivor for people who actually watch Survivor. 100+ scoring rules. Real
            strategy. No luck required.
          </p>
          <a
            href={`${SURVIVOR_APP_URL}/signup`}
            className="group inline-flex items-center gap-3 bg-burgundy-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-burgundy-700 transition-all shadow-lg"
          >
            Join Now
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </section>
      </div>

      <footer className="relative z-10 py-6 border-t border-burgundy-200/30 bg-[#f5f1e8]/80">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-neutral-600">
          <div className="flex items-center justify-center gap-4 mb-3">
            <a href={`${SURVIVOR_APP_URL}/privacy`} className="hover:text-burgundy-600">
              Privacy
            </a>
            <span className="text-neutral-400">|</span>
            <a href={`${SURVIVOR_APP_URL}/terms`} className="hover:text-burgundy-600">
              Terms
            </a>
            <span className="text-neutral-400">|</span>
            <a href={`${SURVIVOR_APP_URL}/contact`} className="hover:text-burgundy-600">
              Contact
            </a>
          </div>
          <p className="text-xs text-neutral-500">
            2025 Reality Games Fantasy League. Not affiliated with CBS or Survivor.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

// PICK YOUR CONCEPT:
// ConceptA = Logo front and center, staggered reveal (user hates this)
// ConceptB = Animated torch with flame, dark theme
// ConceptC = Typography play with SURVIVOR SEASON 50
// ConceptD = Scoreboard - animated 100+ counter, dark theme, stats-forward
// ConceptE = The Glow - mouse-tracking ambient glow, dark theme
// ConceptF = Bold Statement - left-aligned big typography, cream theme

// Export all concepts for preview routes
export const Concepts = {
  A: ConceptA,
  B: ConceptB,
  C: ConceptC,
  D: ConceptD,
  E: ConceptE,
  F: ConceptF,
};

const ActiveConcept = ConceptD; // <-- CHANGE THIS TO PREVIEW DIFFERENT CONCEPTS

export function Home() {
  if (isShortlink()) {
    window.location.href = SURVIVOR_APP_URL + window.location.pathname;
    return null;
  }

  if (isMainDomain()) {
    return <SplashPage />;
  }

  // Allow previewing concepts via URL param: ?concept=A, ?concept=B, etc.
  const params = new URLSearchParams(window.location.search);
  const conceptParam = params.get('concept')?.toUpperCase();
  if (conceptParam && conceptParam in Concepts) {
    const PreviewConcept = Concepts[conceptParam as keyof typeof Concepts];
    return <PreviewConcept />;
  }

  return <ActiveConcept />;
}
