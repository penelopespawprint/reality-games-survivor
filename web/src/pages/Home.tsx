import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

// Check if we're on the main domain (splash page) or survivor subdomain (full app)
const isMainDomain = () => {
  const hostname = window.location.hostname;
  return (
    hostname === 'realitygamesfantasyleague.com' || hostname === 'www.realitygamesfantasyleague.com'
  );
};

// Check if we're on the shortlink domain - redirect to survivor app
const isShortlink = () => {
  const hostname = window.location.hostname;
  return hostname === 'rgfl.app' || hostname === 'www.rgfl.app';
};

const SURVIVOR_APP_URL = 'https://survivor.realitygamesfantasyleague.com';

// ============================================================================
// PARALLAX UTILITIES
// ============================================================================

// Detect touch device for parallax fallback
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia('(hover: none)').matches
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  return isTouch;
}

// RAF-optimized scroll position hook
function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number>();
  const isTouch = useIsTouchDevice();

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        rafRef.current = undefined;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { scrollY, isTouch };
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

// Smooth parallax hook with requestAnimationFrame
function useParallax(speed = 0.5) {
  const [offset, setOffset] = useState(0);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>();
  const isTouch = useIsTouchDevice();

  useEffect(() => {
    if (isTouch) return;

    const handleScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        setOffset(scrolled * speed);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [speed, isTouch]);

  return { elementRef, offset: isTouch ? 0 : offset };
}

// ============================================================================
// PARALLAX COMPONENTS
// ============================================================================

// GPU-accelerated parallax layer component
function ParallaxLayer({
  children,
  speed = 0,
  className = '',
  style = {},
}: {
  children?: React.ReactNode;
  speed: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { scrollY, isTouch } = useScrollPosition();

  const transform = useMemo(() => {
    if (isTouch) return 'translate3d(0, 0, 0)';
    return `translate3d(0, ${scrollY * speed}px, 0)`;
  }, [scrollY, speed, isTouch]);

  return (
    <div
      className={className}
      style={{
        ...style,
        transform,
        willChange: isTouch ? 'auto' : 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

// Scroll-triggered fade-in animation component
function FadeInOnScroll({
  children,
  direction = 'up',
  delay = 0,
  duration = 700,
  className = '',
}: {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const { ref, isInView } = useInView(0.1);

  const transforms: Record<string, string> = {
    up: 'translateY(40px)',
    down: 'translateY(-40px)',
    left: 'translateX(40px)',
    right: 'translateX(-40px)',
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translate3d(0, 0, 0)' : transforms[direction],
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
        transitionDelay: `${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// VISUAL COMPONENTS
// ============================================================================

// Realistic Tiki Torch SVG matching the logo
function TikiTorch({ className, showEmbers = true }: { className?: string; showEmbers?: boolean }) {
  return (
    <div className={`relative ${className}`}>
      {/* Floating Embers */}
      {showEmbers && (
        <div className="absolute inset-0 overflow-visible pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="ember absolute rounded-full"
              style={{
                width: `${3 + Math.random() * 4}px`,
                height: `${3 + Math.random() * 4}px`,
                left: `${40 + Math.random() * 20}%`,
                top: `${15 + Math.random() * 15}%`,
                background: `radial-gradient(circle, ${
                  Math.random() > 0.5 ? '#FFD700' : '#FF6B00'
                } 0%, transparent 70%)`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <svg
        viewBox="0 0 120 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer Flame - Orange/Red */}
        <path
          d="M60 0C60 0 20 55 20 100C20 135 35 165 60 180C85 165 100 135 100 100C100 55 60 0 60 0Z"
          fill="url(#flame-outer)"
          className="animate-flame-outer"
        />

        {/* Middle Flame - Yellow/Orange */}
        <path
          d="M60 15C60 15 30 60 30 95C30 120 42 145 60 155C78 145 90 120 90 95C90 60 60 15 60 15Z"
          fill="url(#flame-middle)"
          className="animate-flame-middle"
        />

        {/* Inner Flame - Yellow/White */}
        <path
          d="M60 35C60 35 42 65 42 88C42 105 50 120 60 128C70 120 78 105 78 88C78 65 60 35 60 35Z"
          fill="url(#flame-inner)"
          className="animate-flame-inner"
        />

        {/* Core Flame - White hot */}
        <path
          d="M60 55C60 55 50 72 50 83C50 92 54 100 60 104C66 100 70 92 70 83C70 72 60 55 60 55Z"
          fill="url(#flame-core)"
          opacity="0.9"
        />

        {/* Torch Bowl/Top */}
        <ellipse cx="60" cy="175" rx="28" ry="8" fill="#4A3728" />
        <ellipse cx="60" cy="172" rx="25" ry="6" fill="#5C4033" />

        {/* Green Leaves at base of flame (like logo) */}
        <path
          d="M40 168C40 168 50 155 60 168C70 155 80 168 80 168"
          stroke="#2D5A27"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M45 172C50 162 55 172 60 165C65 172 70 162 75 172"
          stroke="#3D7A37"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* Torch Handle - Textured Wood */}
        <path
          d="M48 178L45 310C45 314 51 318 60 318C69 318 75 314 75 310L72 178"
          fill="url(#wood-main)"
        />

        {/* Wood Grain Lines */}
        <path d="M50 190L48 300" stroke="#3D2817" strokeWidth="1" opacity="0.4" />
        <path d="M55 185L53 305" stroke="#3D2817" strokeWidth="1" opacity="0.3" />
        <path d="M65 185L67 305" stroke="#3D2817" strokeWidth="1" opacity="0.3" />
        <path d="M70 190L72 300" stroke="#3D2817" strokeWidth="1" opacity="0.4" />

        {/* Rope/Binding Wraps */}
        <ellipse cx="60" cy="195" rx="14" ry="4" fill="#8B7355" />
        <ellipse cx="60" cy="193" rx="13" ry="3" fill="#A08060" />

        <ellipse cx="60" cy="220" rx="13" ry="4" fill="#8B7355" />
        <ellipse cx="60" cy="218" rx="12" ry="3" fill="#A08060" />

        <ellipse cx="60" cy="245" rx="12" ry="4" fill="#8B7355" />
        <ellipse cx="60" cy="243" rx="11" ry="3" fill="#A08060" />

        {/* Gradients */}
        <defs>
          <linearGradient
            id="flame-outer"
            x1="60"
            y1="0"
            x2="60"
            y2="180"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF4500" />
            <stop offset="40%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#B22222" />
          </linearGradient>

          <linearGradient
            id="flame-middle"
            x1="60"
            y1="15"
            x2="60"
            y2="155"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#FF6B00" />
          </linearGradient>

          <linearGradient
            id="flame-inner"
            x1="60"
            y1="35"
            x2="60"
            y2="128"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFACD" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFA500" />
          </linearGradient>

          <linearGradient
            id="flame-core"
            x1="60"
            y1="55"
            x2="60"
            y2="104"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFFACD" />
          </linearGradient>

          <linearGradient
            id="wood-main"
            x1="45"
            y1="178"
            x2="75"
            y2="178"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#5C4033" />
            <stop offset="30%" stopColor="#8B6914" />
            <stop offset="50%" stopColor="#A0522D" />
            <stop offset="70%" stopColor="#8B6914" />
            <stop offset="100%" stopColor="#5C4033" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ============================================================================
// SURVIVOR APP SECTIONS
// ============================================================================

// Premium Hero Section with Multi-Layer Parallax
function PremiumHero() {
  const { user } = useAuth();
  const { scrollY, isTouch } = useScrollPosition();
  const { ref: heroRef, isInView } = useInView(0.1);

  // Different speeds for each layer - creates depth
  const bgLayerOffset = isTouch ? 0 : scrollY * 0.15;
  const midLayerOffset = isTouch ? 0 : scrollY * 0.25;
  const decorLayerOffset = isTouch ? 0 : scrollY * 0.4;
  const torchLayerOffset = isTouch ? 0 : scrollY * -0.08;

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-cream-50 via-cream-100 to-cream-200"
    >
      {/* Background Layer (slowest) - Large ambient orbs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate3d(0, ${bgLayerOffset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      >
        <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-burgundy-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-[500px] h-[500px] bg-amber-500/[0.04] rounded-full blur-3xl" />
      </div>

      {/* Midground Layer - Tribal pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate3d(0, ${midLayerOffset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L55 30 L30 55 L5 30 Z' fill='none' stroke='%23A52A2A' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Foreground Decorative Layer (fastest) - Small accents */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate3d(0, ${decorLayerOffset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      >
        <div className="absolute top-20 right-20 w-2 h-2 bg-burgundy-400/30 rounded-full" />
        <div className="absolute top-40 right-40 w-1 h-1 bg-amber-400/40 rounded-full" />
        <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-burgundy-300/25 rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-orange-400/30 rounded-full" />
        <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-amber-300/20 rounded-full" />
      </div>

      {/* Content Layer - Static relative to viewport */}
      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center min-h-[70vh]">
          {/* Left: Content with fade-in */}
          <FadeInOnScroll direction="up" duration={1000}>
            <div>
              {/* Minimal badge */}
              <div className="inline-flex items-center gap-3 mb-8">
                <span className="w-12 h-px bg-burgundy-400" />
                <span className="text-burgundy-600 text-sm font-medium tracking-widest uppercase">
                  Season 50
                </span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-neutral-900 leading-[0.95] tracking-tight mb-8">
                Fantasy Survivor
                <br />
                <span className="text-burgundy-600">for strategists.</span>
              </h1>

              <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed mb-12 max-w-xl font-light">
                Draft your team. Make weekly picks. Compete in the most comprehensive Survivor
                fantasy experience ever built.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to={user ? '/dashboard' : '/signup'}
                  className="group inline-flex items-center justify-center gap-3 bg-burgundy-600 text-white px-10 py-5 rounded-xl font-semibold text-lg hover:bg-burgundy-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                >
                  {user ? 'Go to Dashboard' : 'Join Free'}
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                {!user && (
                  <Link
                    to="/how-to-play"
                    className="inline-flex items-center justify-center gap-2 text-neutral-700 px-8 py-5 font-medium text-lg hover:text-burgundy-600 transition-colors"
                  >
                    How It Works
                  </Link>
                )}
              </div>
            </div>
          </FadeInOnScroll>

          {/* Right: Torch with inverse parallax (moves up as you scroll down) */}
          <div
            className="flex justify-center lg:justify-end"
            style={{
              transform: `translate3d(0, ${torchLayerOffset}px, 0)`,
              willChange: isTouch ? 'auto' : 'transform',
            }}
          >
            <FadeInOnScroll direction="right" delay={300} duration={1000}>
              <div className="relative">
                {/* Ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-radial from-orange-400/20 via-orange-400/5 to-transparent rounded-full blur-2xl" />

                <TikiTorch className="h-[400px] lg:h-[500px] relative z-10" />
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-400">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </div>
    </section>
  );
}

// Value Proposition Section with Parallax Background
function ValueSection() {
  const { scrollY, isTouch } = useScrollPosition();
  const { ref, isInView } = useInView(0.15);

  const bgOffset = isTouch ? 0 : scrollY * 0.08;
  const accentOffset = isTouch ? 0 : scrollY * -0.05;

  const values = [
    {
      title: 'Comprehensive Scoring',
      description:
        'Every strategic move counts. Idols, votes, challenges, social plays. A scoring system built by superfans who obsess over the details.',
    },
    {
      title: 'Snake Draft Format',
      description:
        'Pick two castaways in our fair async draft. Build your team with the players you believe in most.',
    },
    {
      title: 'Weekly Strategy',
      description:
        'Choose which castaway to play each episode. Your predictions and timing determine your success.',
    },
    {
      title: 'Private Leagues',
      description:
        'Create leagues with friends or join global rankings. Up to 12 players per league, competing for bragging rights.',
    },
  ];

  return (
    <section ref={ref} className="relative py-32 lg:py-40 bg-white overflow-hidden">
      {/* Parallax background gradient */}
      <div
        className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-cream-50/50 to-transparent pointer-events-none"
        style={{
          transform: `translate3d(0, ${bgOffset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />

      {/* Parallax accent orb */}
      <div
        className="absolute -bottom-20 -left-20 w-80 h-80 bg-burgundy-500/[0.02] rounded-full blur-3xl pointer-events-none"
        style={{
          transform: `translate3d(0, ${accentOffset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Section header */}
        <FadeInOnScroll direction="up">
          <div className="max-w-2xl mb-20">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="w-8 h-px bg-burgundy-400" />
              <span className="text-burgundy-600 text-sm font-medium tracking-widest uppercase">
                The Experience
              </span>
            </div>
            <h2 className="font-display text-4xl lg:text-5xl text-neutral-900 leading-tight mb-6">
              Built for players who
              <br />
              <span className="text-burgundy-600">live and breathe Survivor.</span>
            </h2>
            <p className="text-lg text-neutral-600 leading-relaxed">
              No luck required. Real strategy rewarded.
            </p>
          </div>
        </FadeInOnScroll>

        {/* Value grid with staggered fade-in */}
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-16">
          {values.map((value, i) => (
            <FadeInOnScroll key={i} direction="up" delay={150 + i * 100}>
              <div className="group flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cream-100 flex items-center justify-center group-hover:bg-burgundy-50 transition-colors duration-300">
                  <span className="text-burgundy-600 font-display text-xl">{i + 1}</span>
                </div>
                <div>
                  <h3 className="font-display text-xl text-neutral-900 mb-3 group-hover:text-burgundy-600 transition-colors duration-300">
                    {value.title}
                  </h3>
                  <p className="text-neutral-600 leading-relaxed">{value.description}</p>
                </div>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// Season Spotlight Section with Multi-Layer Parallax
function SeasonSpotlight() {
  const { scrollY, isTouch } = useScrollPosition();
  const { ref, isInView } = useInView(0.2);

  const bgOrb1Offset = isTouch ? 0 : scrollY * 0.15;
  const bgOrb2Offset = isTouch ? 0 : scrollY * -0.1;
  const gridOffset = isTouch ? 0 : scrollY * 0.05;

  return (
    <section ref={ref} className="relative py-32 lg:py-40 bg-neutral-900 overflow-hidden">
      {/* Parallax background orbs */}
      <div
        className="absolute top-1/4 -right-20 w-96 h-96 bg-burgundy-500/10 rounded-full blur-3xl pointer-events-none"
        style={{
          transform: `translate3d(0, ${bgOrb1Offset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />
      <div
        className="absolute bottom-1/4 -left-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"
        style={{
          transform: `translate3d(0, ${bgOrb2Offset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />

      {/* Subtle parallax grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          transform: `translate3d(0, ${gridOffset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Visual with slide-in */}
          <FadeInOnScroll direction="left" duration={1000}>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-neutral-800 to-neutral-900 p-12 flex items-center justify-center border border-white/5">
                <TikiTorch className="h-80 max-w-full" showEmbers={true} />
              </div>
              {/* Decorative accent */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-2xl bg-burgundy-600/20 -z-10" />
            </div>
          </FadeInOnScroll>

          {/* Right: Content with slide-in */}
          <FadeInOnScroll direction="right" delay={150} duration={1000}>
            <div>
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="w-8 h-px bg-burgundy-400" />
                <span className="text-burgundy-400 text-sm font-medium tracking-widest uppercase">
                  Now Open
                </span>
              </div>

              <h2 className="font-display text-4xl lg:text-5xl text-white leading-tight mb-6">
                Season 50
                <br />
                <span className="text-burgundy-400">In the Hands of the Fans</span>
              </h2>

              <p className="text-lg text-neutral-400 leading-relaxed mb-8">
                24 legendary castaways return. The greatest collection of players in Survivor
                history. Who will you draft?
              </p>

              <div className="space-y-4 mb-10">
                <div className="flex items-center gap-4 text-neutral-300">
                  <span className="w-2 h-2 bg-burgundy-500 rounded-full" />
                  <span>Premiere: February 25, 2026</span>
                </div>
                <div className="flex items-center gap-4 text-neutral-300">
                  <span className="w-2 h-2 bg-burgundy-500 rounded-full" />
                  <span>Draft Deadline: March 2, 2026</span>
                </div>
                <div className="flex items-center gap-4 text-neutral-300">
                  <span className="w-2 h-2 bg-burgundy-500 rounded-full" />
                  <span>Registration now open</span>
                </div>
              </div>

              <Link
                to="/signup"
                className="group inline-flex items-center gap-3 bg-white text-neutral-900 px-8 py-4 rounded-xl font-semibold hover:bg-cream-50 transition-all duration-300 hover:-translate-y-0.5"
              >
                Join Season 50
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </FadeInOnScroll>
        </div>
      </div>
    </section>
  );
}

// Premium CTA Section with Parallax
function PremiumCTA() {
  const { user } = useAuth();
  const { scrollY, isTouch } = useScrollPosition();
  const { ref, isInView } = useInView(0.3);

  const orb1Offset = isTouch ? 0 : scrollY * 0.1;
  const orb2Offset = isTouch ? 0 : scrollY * -0.08;

  return (
    <section
      ref={ref}
      className="relative py-32 lg:py-40 bg-gradient-to-br from-burgundy-600 via-burgundy-700 to-burgundy-800 overflow-hidden"
    >
      {/* Parallax decorative orbs */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
        style={{
          transform: `translate3d(33%, calc(-50% + ${orb1Offset}px), 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"
        style={{
          transform: `translate3d(-33%, calc(50% + ${orb2Offset}px), 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <FadeInOnScroll direction="up">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-8">
            The fantasy league
            <br />
            Survivor deserves.
          </h2>
        </FadeInOnScroll>

        <FadeInOnScroll direction="up" delay={100}>
          <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">
            Free to play. Built for strategy. Join thousands of superfans competing in the ultimate
            Survivor fantasy experience.
          </p>
        </FadeInOnScroll>

        <FadeInOnScroll direction="up" delay={200}>
          {user ? (
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-3 bg-white text-burgundy-700 px-12 py-5 rounded-xl font-semibold text-lg hover:bg-cream-50 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              View Your Leagues
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <Link
              to="/signup"
              className="group inline-flex items-center gap-3 bg-white text-burgundy-700 px-12 py-5 rounded-xl font-semibold text-lg hover:bg-cream-50 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              Join Free
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </FadeInOnScroll>
      </div>
    </section>
  );
}

// ============================================================================
// SPLASH PAGE (Main Domain)
// ============================================================================

function SplashPage() {
  const { scrollY, isTouch } = useScrollPosition();

  // Background parallax layers
  const bgLayer1Offset = isTouch ? 0 : scrollY * 0.1;
  const bgLayer2Offset = isTouch ? 0 : scrollY * -0.08;
  const bgLayer3Offset = isTouch ? 0 : scrollY * 0.15;

  // Calculate section visibility with smooth transitions
  const getOpacity = (start: number, fadeIn: number, hold: number, fadeOut: number) => {
    if (scrollY < start) return 0;
    if (scrollY < start + fadeIn) return (scrollY - start) / fadeIn;
    if (scrollY < start + fadeIn + hold) return 1;
    if (scrollY < start + fadeIn + hold + fadeOut)
      return 1 - (scrollY - start - fadeIn - hold) / fadeOut;
    return 0;
  };

  // Active section for progress indicator
  const activeSection = useMemo(() => {
    if (scrollY < 400) return 0;
    if (scrollY < 800) return 1;
    if (scrollY < 1200) return 2;
    if (scrollY < 1600) return 3;
    if (scrollY < 2000) return 4;
    return 5;
  }, [scrollY]);

  return (
    <div className="min-h-[500vh] bg-cream-50 overflow-x-hidden relative">
      {/* Background Layer 1 - Slowest, largest orbs */}
      <div
        className="fixed top-0 right-0 w-[50vw] h-[50vh] bg-gradient-radial from-burgundy-500/[0.03] to-transparent pointer-events-none"
        style={{
          transform: `translate3d(0, ${bgLayer1Offset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />

      {/* Background Layer 2 - Medium speed */}
      <div
        className="fixed bottom-0 left-0 w-[40vw] h-[40vh] bg-gradient-radial from-amber-500/[0.04] to-transparent pointer-events-none"
        style={{
          transform: `translate3d(0, ${bgLayer2Offset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />

      {/* Background Layer 3 - Fastest, smallest accents */}
      <div
        className="fixed top-1/3 left-1/4 w-[20vw] h-[20vh] bg-gradient-radial from-burgundy-400/[0.02] to-transparent pointer-events-none"
        style={{
          transform: `translate3d(0, ${bgLayer3Offset}px, 0)`,
          willChange: isTouch ? 'auto' : 'transform',
        }}
      />

      {/* Fixed container for scroll-based story */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="max-w-4xl mx-auto px-8 text-center pointer-events-auto">
          {/* Section 1: Logo & Brand */}
          <div
            className="transition-opacity duration-300"
            style={{
              opacity: getOpacity(0, 100, 300, 200),
              transform: `translate3d(0, ${-scrollY * 0.15}px, 0) scale(${Math.max(0.9, 1 - scrollY / 3000)})`,
              willChange: isTouch ? 'auto' : 'transform, opacity',
            }}
          >
            <img
              src="/logo.png"
              alt="Reality Games Fantasy League"
              className="h-32 sm:h-40 lg:h-48 mx-auto mb-8"
            />
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-neutral-800 leading-[1.05] tracking-tight">
              REALITY GAMES
              <br />
              <span className="text-burgundy-600">FANTASY LEAGUE</span>
            </h1>
          </div>

          {/* Section 2: The Problem */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-8"
            style={{
              opacity: getOpacity(400, 150, 250, 150),
              transform: `translate3d(0, ${Math.max(0, 30 - (scrollY - 400) * 0.05)}px, 0)`,
              willChange: isTouch ? 'auto' : 'transform, opacity',
            }}
          >
            <p className="font-display text-2xl sm:text-3xl lg:text-4xl text-neutral-700 leading-relaxed max-w-3xl mx-auto">
              Bored of fantasy leagues where you pick one Survivor and hope for the best?
            </p>
          </div>

          {/* Section 3: The Solution */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-8"
            style={{
              opacity: getOpacity(800, 150, 250, 150),
              transform: `translate3d(0, ${Math.max(0, 30 - (scrollY - 800) * 0.05)}px, 0)`,
              willChange: isTouch ? 'auto' : 'transform, opacity',
            }}
          >
            <p className="text-xl sm:text-2xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
              We built something different.
              <br />
              <span className="text-burgundy-600 font-semibold">
                A scoring system with 100+ rules
              </span>{' '}
              that rewards real strategy.
            </p>
          </div>

          {/* Section 4: The Details */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-8"
            style={{
              opacity: getOpacity(1200, 150, 250, 150),
              transform: `translate3d(0, ${Math.max(0, 30 - (scrollY - 1200) * 0.05)}px, 0)`,
              willChange: isTouch ? 'auto' : 'transform, opacity',
            }}
          >
            <p className="text-xl sm:text-2xl text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-6">
              Every vote. Every idol play.
              <br />
              Every alliance move and blindside.
            </p>
            <p className="text-lg text-neutral-500 italic">No luck required.</p>
          </div>

          {/* Section 5: Season 50 */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-8"
            style={{
              opacity: getOpacity(1600, 150, 250, 150),
              transform: `translate3d(0, ${Math.max(0, 30 - (scrollY - 1600) * 0.05)}px, 0)`,
              willChange: isTouch ? 'auto' : 'transform, opacity',
            }}
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-burgundy-400" />
              <span className="text-burgundy-600 text-sm font-medium tracking-widest uppercase">
                Now Open
              </span>
              <span className="w-8 h-px bg-burgundy-400" />
            </div>
            <p className="font-display text-2xl sm:text-3xl text-neutral-800 mb-2">
              Season 50: In the Hands of the Fans
            </p>
            <p className="text-neutral-500">24 legendary castaways return.</p>
          </div>

          {/* Section 6: CTA */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-8"
            style={{
              opacity: getOpacity(2000, 150, 1000, 0),
              transform: `translate3d(0, ${Math.max(0, 30 - (scrollY - 2000) * 0.05)}px, 0)`,
              willChange: isTouch ? 'auto' : 'transform, opacity',
            }}
          >
            <p className="text-neutral-500 mb-8">Premiere: February 25, 2026</p>

            <a
              href={`${SURVIVOR_APP_URL}/signup`}
              className="group inline-flex items-center gap-3 bg-burgundy-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-burgundy-700 transition-all duration-300 hover:-translate-y-0.5"
            >
              Join Season 50
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </a>

            <p className="text-neutral-400 text-sm mt-6">
              Already have an account?{' '}
              <a href={`${SURVIVOR_APP_URL}/login`} className="text-burgundy-600 hover:underline">
                Log in
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Scroll indicator - fades out */}
      <div
        className="fixed bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-400 transition-opacity duration-300"
        style={{ opacity: Math.max(0, 1 - scrollY / 200) }}
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </div>

      {/* Progress indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === activeSection
                ? 'bg-burgundy-500 scale-125'
                : i < activeSection
                  ? 'bg-burgundy-300'
                  : 'bg-neutral-300'
            }`}
          />
        ))}
      </div>

      {/* Footer - at the very bottom */}
      <div className="absolute bottom-0 left-0 right-0 py-8 bg-cream-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-3 text-sm text-neutral-500">
            <a
              href={`${SURVIVOR_APP_URL}/privacy`}
              className="hover:text-burgundy-600 transition-colors"
            >
              Privacy
            </a>
            <span>|</span>
            <a
              href={`${SURVIVOR_APP_URL}/terms`}
              className="hover:text-burgundy-600 transition-colors"
            >
              Terms
            </a>
            <span>|</span>
            <a
              href={`${SURVIVOR_APP_URL}/contact`}
              className="hover:text-burgundy-600 transition-colors"
            >
              Contact
            </a>
          </div>
          <p className="text-xs text-neutral-400">
            2025 Reality Games Fantasy League. Not affiliated with CBS or Survivor.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SURVIVOR APP HOME PAGE
// ============================================================================

function SurvivorHome() {
  return (
    <div className="min-h-screen bg-cream-50">
      <Navigation />

      {/* Premium Hero with Multi-Layer Parallax */}
      <PremiumHero />

      {/* Value Props with Parallax Background */}
      <ValueSection />

      {/* Season Spotlight with Parallax */}
      <SeasonSpotlight />

      {/* Premium CTA with Parallax */}
      <PremiumCTA />

      <Footer />
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

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
