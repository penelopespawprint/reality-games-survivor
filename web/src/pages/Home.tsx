import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useState, useEffect, useMemo, useCallback } from 'react';

// ============================================================================
// MINI TORCH COMPONENT - Improved design for transformed icons
// ============================================================================

function MiniTorch() {
  return (
    <div className="relative flex flex-col items-center">
      {/* Glow */}
      <div
        className="absolute -top-2 w-10 h-12 rounded-full blur-lg"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(237, 137, 54, 0.45) 0%, rgba(178, 34, 34, 0.2) 40%, transparent 70%)',
          animation: 'glowPulse 1.5s ease-in-out infinite alternate',
        }}
      />
      {/* Torch SVG */}
      <svg width="32" height="65" viewBox="0 0 32 65" className="relative z-10">
        <defs>
          <linearGradient id="miniHandleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6B4423" />
            <stop offset="50%" stopColor="#A67C52" />
            <stop offset="100%" stopColor="#654321" />
          </linearGradient>
        </defs>
        {/* Handle */}
        <rect x="13" y="38" width="6" height="24" rx="1" fill="url(#miniHandleGrad)" />
        <ellipse cx="16" cy="38" rx="5" ry="2" fill="#C9A050" />
        {/* Flame layers */}
        <g style={{ transformOrigin: '16px 38px' }}>
          <path
            d="M16 4 C24 12, 28 20, 25 30 C22 36, 19 39, 16 40 C13 39, 10 36, 7 30 C4 20, 8 12, 16 4"
            fill="#B22222"
            style={{ animation: 'flameOuter 0.5s ease-in-out infinite alternate' }}
          />
          <path
            d="M16 9 C22 15, 24 22, 22 30 C20 35, 18 38, 16 39 C14 38, 12 35, 10 30 C8 22, 10 15, 16 9"
            fill="#ED8936"
            style={{ animation: 'flameMid 0.45s ease-in-out infinite alternate' }}
          />
          <path
            d="M16 14 C20 19, 21 25, 19 32 C18 36, 17 38, 16 38 C15 38, 14 36, 13 32 C11 25, 12 19, 16 14"
            fill="#F6E05E"
            style={{ animation: 'flameInner 0.4s ease-in-out infinite alternate' }}
          />
          <path
            d="M16 19 C18 23, 19 27, 18 33 C17 35, 16 37, 16 37 C16 37, 15 35, 14 33 C13 27, 14 23, 16 19"
            fill="#FFFACD"
            style={{ animation: 'flameCore 0.35s ease-in-out infinite alternate' }}
          />
        </g>
      </svg>
    </div>
  );
}

// ============================================================================
// FLOATING ICON COMPONENT
// ============================================================================

interface FloatingIconProps {
  icon: 'rose' | 'key' | 'ticket' | 'torch';
  position: { x: number; y: number };
  entryDelay: number;
  floatClass: string;
  shouldMorph: boolean;
  morphDelay: number;
}

function FloatingIcon({
  icon,
  position,
  entryDelay,
  floatClass,
  shouldMorph,
  morphDelay,
}: FloatingIconProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasMorphed, setHasMorphed] = useState(icon === 'torch');

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), entryDelay);
    return () => clearTimeout(timer);
  }, [entryDelay]);

  useEffect(() => {
    if (shouldMorph && !hasMorphed && icon !== 'torch') {
      const timer = setTimeout(() => setHasMorphed(true), morphDelay);
      return () => clearTimeout(timer);
    }
  }, [shouldMorph, morphDelay, hasMorphed, icon]);

  const getEmoji = () => {
    switch (icon) {
      case 'rose':
        return '🌹';
      case 'key':
        return '🔑';
      case 'ticket':
        return '🎫';
      case 'torch':
        return null;
    }
  };

  return (
    <div
      className={`absolute transition-all duration-600 ${floatClass} ${
        isVisible ? 'opacity-75 scale-100' : 'opacity-0 scale-0'
      }`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
    >
      {/* Original emoji */}
      <span
        className={`text-4xl block transition-all duration-400 ${
          hasMorphed && icon !== 'torch' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
        }`}
      >
        {icon === 'torch' ? null : getEmoji()}
      </span>

      {/* Torch replacement */}
      {icon !== 'torch' && (
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
            hasMorphed ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
        >
          <MiniTorch />
        </div>
      )}

      {/* If already a torch */}
      {icon === 'torch' && <MiniTorch />}
    </div>
  );
}

// ============================================================================
// COUNTDOWN TIMER
// ============================================================================

function CountdownTimer() {
  const calculateTimeLeft = useCallback(() => {
    const target = new Date('2026-02-25T15:00:00-08:00').getTime(); // Feb 25, 2026 3pm PST
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0 };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    };
  }, []);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <div className="text-center">
        <div className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium text-burgundy-500 tabular-nums leading-none tracking-tight">
          {timeLeft.days}
        </div>
        <div className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-neutral-400 mt-2">
          Days
        </div>
      </div>
      <span className="text-3xl sm:text-4xl text-burgundy-500/25 font-light mb-4">|</span>
      <div className="text-center">
        <div className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium text-burgundy-500 tabular-nums leading-none tracking-tight">
          {String(timeLeft.hours).padStart(2, '0')}
        </div>
        <div className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-neutral-400 mt-2">
          Hours
        </div>
      </div>
      <span className="text-3xl sm:text-4xl text-burgundy-500/25 font-light mb-4">|</span>
      <div className="text-center">
        <div className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium text-burgundy-500 tabular-nums leading-none tracking-tight">
          {String(timeLeft.minutes).padStart(2, '0')}
        </div>
        <div className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-neutral-400 mt-2">
          Minutes
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN HOME COMPONENT
// ============================================================================

export function Home() {
  const { user } = useAuth();
  const [startMorphing, setStartMorphing] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  // Define floating icons with positions - spread around edges
  const floatingIcons = useMemo(
    () => [
      { icon: 'rose' as const, position: { x: 5, y: 8 }, floatClass: 'animate-float-1' },
      { icon: 'key' as const, position: { x: 92, y: 6 }, floatClass: 'animate-float-2' },
      { icon: 'ticket' as const, position: { x: 3, y: 25 }, floatClass: 'animate-float-3' },
      { icon: 'rose' as const, position: { x: 95, y: 18 }, floatClass: 'animate-float-4' },
      { icon: 'key' as const, position: { x: 4, y: 45 }, floatClass: 'animate-float-5' },
      { icon: 'ticket' as const, position: { x: 96, y: 40 }, floatClass: 'animate-float-6' },
      { icon: 'torch' as const, position: { x: 5, y: 62 }, floatClass: 'animate-float-1' },
      { icon: 'rose' as const, position: { x: 94, y: 58 }, floatClass: 'animate-float-2' },
      { icon: 'key' as const, position: { x: 8, y: 78 }, floatClass: 'animate-float-3' },
      { icon: 'ticket' as const, position: { x: 95, y: 75 }, floatClass: 'animate-float-4' },
      { icon: 'rose' as const, position: { x: 15, y: 88 }, floatClass: 'animate-float-5' },
      { icon: 'key' as const, position: { x: 88, y: 90 }, floatClass: 'animate-float-6' },
      { icon: 'torch' as const, position: { x: 8, y: 35 }, floatClass: 'animate-float-2' },
      { icon: 'ticket' as const, position: { x: 92, y: 52 }, floatClass: 'animate-float-3' },
    ],
    []
  );

  useEffect(() => {
    const contentTimer = setTimeout(() => setContentVisible(true), 500);
    const morphTimer = setTimeout(() => setStartMorphing(true), 2000);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(morphTimer);
    };
  }, []);

  let morphIndex = 0;

  return (
    <div className="h-screen w-screen overflow-hidden bg-cream-50 relative">
      {/* Floating icons layer */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {floatingIcons.map((item, index) => {
          const isTorch = item.icon === 'torch';
          const currentMorphIndex = isTorch ? -1 : morphIndex++;
          return (
            <FloatingIcon
              key={index}
              icon={item.icon}
              position={item.position}
              entryDelay={200 + index * 120}
              floatClass={item.floatClass}
              shouldMorph={startMorphing}
              morphDelay={currentMorphIndex * 500}
            />
          );
        })}
      </div>

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-10 py-5 bg-gradient-to-b from-cream-50 to-transparent">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-9">
            <Link
              to="/"
              className="text-neutral-500 hover:text-burgundy-500 font-display text-sm sm:text-base font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              to="/contact"
              className="text-neutral-500 hover:text-burgundy-500 font-display text-sm sm:text-base font-medium transition-colors"
            >
              Contact
            </Link>
          </div>

          <Link
            to={user ? '/dashboard' : '/signup'}
            className="px-5 sm:px-7 py-2.5 sm:py-3 bg-burgundy-500 text-white font-display text-xs sm:text-sm font-semibold rounded hover:bg-burgundy-600 transition-all shadow-lg shadow-burgundy-500/25"
          >
            {user ? 'Dashboard' : 'Join Survivor Season 50'}
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="h-full flex flex-col items-center justify-center px-6 pt-20 pb-12 relative z-20">
        <div
          className={`text-center max-w-[680px] mx-auto transition-all duration-800 ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          {/* Logo */}
          <div className="mb-10 sm:mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <img
              src="/logo.png"
              alt="Reality Games Fantasy League"
              className="w-72 sm:w-80 h-auto mx-auto"
            />
          </div>

          {/* Copy */}
          <div className="space-y-4 mb-11 sm:mb-12">
            <p className="font-display text-lg sm:text-xl text-neutral-600 leading-relaxed font-normal">
              Get ready for fantasy done differently. Built by superfans, for superfans—no corporate
              shortcuts, no afterthoughts, just games designed by people who actually care.
            </p>
            <p className="font-display text-lg sm:text-xl text-neutral-600 leading-relaxed font-normal">
              We're kicking off with the season fans have been waiting for—
              <span className="text-burgundy-500 font-medium">Survivor 50</span>.
              <br />
              <span className="italic text-neutral-400">Don't let your torch get snuffed.</span>
            </p>
          </div>

          {/* Countdown */}
          <div className="mb-3">
            <CountdownTimer />
          </div>

          {/* Subtext */}
          <p className="text-neutral-400 text-sm mb-9">League registration closes February 25, 2026 at 3p PST</p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="w-full sm:w-auto px-14 py-5 bg-burgundy-500 text-white font-display text-sm font-semibold tracking-wide uppercase rounded hover:bg-burgundy-600 transition-all shadow-xl shadow-burgundy-500/30"
            >
              {user ? 'Dashboard' : 'Sign Up'}
            </Link>

            <Link
              to="/how-to-play"
              className="w-full sm:w-auto px-10 py-5 bg-transparent border border-cream-400 text-neutral-500 font-display text-sm font-medium rounded hover:text-burgundy-500 hover:border-burgundy-500 hover:bg-burgundy-500/5 transition-all"
            >
              How it Works
            </Link>
          </div>

          {/* Login link */}
          {!user && (
            <p className="text-neutral-400 text-sm mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-burgundy-500 hover:text-burgundy-600 underline">
                Log in
              </Link>
            </p>
          )}
        </div>
      </main>

      {/* Animation styles */}
      <style>{`
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0) rotate(-3deg); }
          25% { transform: translate(15px, -20px) rotate(2deg); }
          50% { transform: translate(-10px, 10px) rotate(-2deg); }
          75% { transform: translate(-15px, -15px) rotate(3deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0) rotate(2deg); }
          33% { transform: translate(-20px, -25px) rotate(-3deg); }
          66% { transform: translate(10px, 15px) rotate(2deg); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translate(0, 0) rotate(-2deg); }
          50% { transform: translate(20px, -15px) rotate(3deg); }
        }
        @keyframes float-4 {
          0%, 100% { transform: translate(0, 0) rotate(3deg); }
          25% { transform: translate(-15px, 20px) rotate(-2deg); }
          75% { transform: translate(15px, -10px) rotate(2deg); }
        }
        @keyframes float-5 {
          0%, 100% { transform: translate(0, 0) rotate(-1deg); }
          40% { transform: translate(-10px, -20px) rotate(2deg); }
          80% { transform: translate(20px, 10px) rotate(-3deg); }
        }
        @keyframes float-6 {
          0%, 100% { transform: translate(0, 0) rotate(1deg); }
          30% { transform: translate(18px, -12px) rotate(-2deg); }
          60% { transform: translate(-12px, 18px) rotate(3deg); }
        }

        .animate-float-1 { animation: float-1 12s ease-in-out infinite; }
        .animate-float-2 { animation: float-2 14s ease-in-out infinite; }
        .animate-float-3 { animation: float-3 11s ease-in-out infinite; }
        .animate-float-4 { animation: float-4 13s ease-in-out infinite; }
        .animate-float-5 { animation: float-5 15s ease-in-out infinite; }
        .animate-float-6 { animation: float-6 16s ease-in-out infinite; }

        @keyframes flameOuter {
          0% { transform: scaleY(1) scaleX(1); }
          100% { transform: scaleY(1.06) scaleX(0.96); }
        }
        @keyframes flameMid {
          0% { transform: scaleY(1); }
          100% { transform: scaleY(1.08) translateY(-1px); }
        }
        @keyframes flameInner {
          0% { transform: scaleY(1); }
          100% { transform: scaleY(1.1); }
        }
        @keyframes flameCore {
          0% { transform: scaleY(1) scaleX(1); }
          100% { transform: scaleY(1.12) scaleX(0.95); }
        }

        @keyframes glowPulse {
          0% { opacity: 0.5; }
          100% { opacity: 0.9; }
        }

        .duration-400 { transition-duration: 400ms; }
        .duration-600 { transition-duration: 600ms; }
        .duration-800 { transition-duration: 800ms; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

export default Home;
