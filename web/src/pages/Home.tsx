import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Trophy,
  Users,
  Target,
  Zap,
  BarChart3,
  Shield,
} from 'lucide-react';

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

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const { ref, isInView } = useInView(0.5);

  useEffect(() => {
    if (startOnView && isInView && !hasStarted) {
      setHasStarted(true);
    }
  }, [isInView, startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return { count, ref };
}

// 3D Tilt Card Hook
function useTilt(maxTilt = 15) {
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
  });
  const elementRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      const rotateY = (mouseX / (rect.width / 2)) * maxTilt;
      const rotateX = -(mouseY / (rect.height / 2)) * maxTilt;

      setTiltStyle({
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      });
    },
    [maxTilt]
  );

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    });
  }, []);

  return { elementRef, tiltStyle, handleMouseMove, handleMouseLeave };
}

// Parallax Scroll Hook
function useParallax(speed = 0.5) {
  const [offset, setOffset] = useState(0);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const elementTop = rect.top + scrolled;
      const windowHeight = window.innerHeight;

      // Calculate how far we've scrolled past the element's starting position
      const distanceFromTop = scrolled + windowHeight - elementTop;
      const newOffset = distanceFromTop * speed;

      setOffset(newOffset);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { elementRef, offset };
}

// 3D Tilt Card Component
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { elementRef, tiltStyle, handleMouseMove, handleMouseLeave } = useTilt(12);

  return (
    <div
      ref={elementRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out ${className}`}
      style={{
        ...tiltStyle,
        transformStyle: 'preserve-3d',
      }}
    >
      <div style={{ transform: 'translateZ(20px)' }}>{children}</div>
    </div>
  );
}

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

// Hero Slider Component
function HeroSlider() {
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const heroParallax1 = useParallax(0.1);
  const heroParallax2 = useParallax(-0.08);
  const heroParallax3 = useParallax(0.15);

  const slides = [
    {
      badge: 'Season 50 Now Open',
      headline: 'Fantasy Survivor',
      subheadline: 'Built for Superfans',
      description: 'Draft your dream team. Make weekly picks. Compete for glory.',
      cta: user ? 'Go to Dashboard' : 'Join Free',
      ctaLink: user ? '/dashboard' : '/signup',
    },
    {
      badge: '100+ Scoring Rules',
      headline: 'Every Move',
      subheadline: 'Counts',
      description: 'Idols, votes, challenges, social plays — we score it all.',
      cta: 'See Scoring Rules',
      ctaLink: '/scoring-rules',
    },
    {
      badge: 'Premiere Feb 25, 2026',
      headline: '24 Legends',
      subheadline: 'One Winner',
      description: 'The greatest players return. Who will you draft?',
      cta: 'Create a League',
      ctaLink: user ? '/leagues' : '/signup',
    },
  ];

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), 500);
    },
    [isTransitioning]
  );

  const nextSlide = useCallback(
    () => goToSlide((currentSlide + 1) % slides.length),
    [currentSlide, goToSlide, slides.length]
  );

  const prevSlide = useCallback(
    () => goToSlide((currentSlide - 1 + slides.length) % slides.length),
    [currentSlide, goToSlide, slides.length]
  );

  useEffect(() => {
    intervalRef.current = setInterval(nextSlide, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [nextSlide]);

  const slide = slides[currentSlide];

  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-gradient-to-br from-cream-100 via-cream-50 to-cream-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #A52A2A 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Parallax Decorative Elements */}
      <div
        ref={heroParallax1.elementRef}
        className="absolute -top-20 -right-20 w-96 h-96 bg-burgundy-500/5 rounded-full blur-3xl pointer-events-none"
        style={{ transform: `translateY(${heroParallax1.offset}px)` }}
      />
      <div
        ref={heroParallax2.elementRef}
        className="absolute top-1/2 -left-32 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"
        style={{ transform: `translateY(${heroParallax2.offset}px)` }}
      />
      <div
        ref={heroParallax3.elementRef}
        className="absolute -bottom-20 right-1/4 w-80 h-80 bg-amber-300/10 rounded-full blur-3xl pointer-events-none"
        style={{ transform: `translateY(${heroParallax3.offset}px)` }}
      />

      <div className="relative max-w-7xl mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[60vh]">
          {/* Left: Content */}
          <div
            className={`transition-all duration-700 ${
              isTransitioning ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'
            }`}
          >
            <div className="inline-flex items-center gap-2 bg-burgundy-500/10 text-burgundy-600 px-4 py-2 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 bg-burgundy-500 rounded-full animate-pulse" />
              {slide.badge}
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-neutral-800 leading-[1.1] tracking-tight mb-4">
              {slide.headline}
              <br />
              <span className="text-burgundy-600">{slide.subheadline}</span>
            </h1>

            <p className="text-xl text-neutral-600 leading-relaxed mb-8 max-w-lg">
              {slide.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                to={slide.ctaLink}
                className="btn btn-primary text-lg px-10 py-4 shadow-float hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 hover:scale-105 inline-flex items-center gap-2 group"
              >
                {slide.cta}
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              {!user && (
                <Link
                  to="/how-to-play"
                  className="btn btn-secondary text-lg px-10 py-4 transition-all duration-300 hover:-translate-y-1"
                >
                  How It Works
                </Link>
              )}
            </div>

            {/* Slide Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={prevSlide}
                className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5 text-neutral-600" />
              </button>

              <div className="flex gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentSlide
                        ? 'w-8 bg-burgundy-500'
                        : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={nextSlide}
                className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5 text-neutral-600" />
              </button>
            </div>
          </div>

          {/* Right: Torch */}
          <div
            className={`flex justify-center lg:justify-end transition-all duration-700 delay-150 ${
              isTransitioning
                ? 'opacity-0 translate-x-8 scale-95'
                : 'opacity-100 translate-x-0 scale-100'
            }`}
          >
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-400/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-yellow-400/30 rounded-full blur-2xl animate-pulse delay-150" />

              <TikiTorch className="h-80 sm:h-96 lg:h-[28rem] relative z-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Alternating Feature Block Component
function FeatureBlock({
  title,
  subtitle,
  description,
  features,
  imagePosition,
  imageBg,
  icon: Icon,
  delay = 0,
}: {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  imagePosition: 'left' | 'right';
  imageBg: string;
  icon: React.ElementType;
  delay?: number;
}) {
  const { ref, isInView } = useInView(0.2);
  const decorParallax = useParallax(imagePosition === 'left' ? 0.08 : -0.08);

  const content = (
    <div
      className={`flex flex-col justify-center transition-all duration-700 ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="inline-flex items-center gap-2 text-burgundy-600 font-semibold text-sm mb-4">
        <Icon className="h-5 w-5" />
        {subtitle}
      </div>

      <h2 className="font-display text-4xl lg:text-5xl text-neutral-800 mb-6 leading-tight">
        {title}
      </h2>

      <p className="text-lg text-neutral-600 leading-relaxed mb-8">{description}</p>

      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li
            key={i}
            className={`flex items-center gap-3 text-neutral-700 transition-all duration-500 ${
              isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            }`}
            style={{ transitionDelay: `${delay + 100 + i * 100}ms` }}
          >
            <span className="w-6 h-6 rounded-full bg-burgundy-100 flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-burgundy-500" />
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );

  const image = (
    <div
      className={`relative transition-all duration-700 ${
        isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{ transitionDelay: `${delay + 200}ms` }}
    >
      <div
        className={`aspect-square rounded-3xl ${imageBg} p-8 lg:p-12 flex items-center justify-center shadow-elevated overflow-hidden group`}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <TikiTorch className="h-full max-h-80 transition-transform duration-500 group-hover:scale-110" />
        </div>
      </div>

      {/* Decorative Elements with Parallax */}
      <div
        ref={decorParallax.elementRef}
        className="absolute -bottom-4 -right-4 w-24 h-24 bg-burgundy-500/10 rounded-2xl -z-10"
        style={{ transform: `translateY(${decorParallax.offset}px)` }}
      />
      <div className="absolute -top-4 -left-4 w-16 h-16 bg-orange-500/10 rounded-xl -z-10" />
    </div>
  );

  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
      {imagePosition === 'left' ? (
        <>
          {image}
          {content}
        </>
      ) : (
        <>
          {content}
          {image}
        </>
      )}
    </div>
  );
}

// Stats Section with Animated Counters
function StatsSection() {
  const { ref: ref1, isInView: inView1 } = useInView(0.5);
  const counter1 = useAnimatedCounter(100, 2000, true);
  const counter2 = useAnimatedCounter(24, 1500, true);
  const counter3 = useAnimatedCounter(50, 1800, true);
  const statsParallax1 = useParallax(0.06);
  const statsParallax2 = useParallax(-0.04);

  const stats = [
    { value: counter1.count, suffix: '+', label: 'Scoring Rules', ref: counter1.ref },
    { value: counter2.count, suffix: '', label: 'Legendary Castaways', ref: counter2.ref },
    { value: counter3.count, suffix: '', label: 'Seasons of History', ref: counter3.ref },
  ];

  return (
    <section ref={ref1} className="py-20 bg-neutral-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Parallax Glow Effects */}
      <div
        ref={statsParallax1.elementRef}
        className="absolute -top-32 left-1/4 w-64 h-64 bg-burgundy-500/20 rounded-full blur-3xl pointer-events-none"
        style={{ transform: `translateY(${statsParallax1.offset}px)` }}
      />
      <div
        ref={statsParallax2.elementRef}
        className="absolute -bottom-32 right-1/4 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none"
        style={{ transform: `translateY(${statsParallax2.offset}px)` }}
      />

      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, i) => (
            <div
              key={i}
              ref={stat.ref}
              className={`transition-all duration-700 ${
                inView1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="font-display text-6xl lg:text-7xl text-burgundy-400 mb-2">
                {stat.value}
                {stat.suffix}
              </div>
              <div className="text-neutral-400 text-lg">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 3D Tilt Card Feature Section
function TiltCardSection() {
  const { ref, isInView } = useInView(0.1);
  const parallax1 = useParallax(0.05);
  const parallax2 = useParallax(-0.03);

  const features = [
    {
      icon: Zap,
      title: 'Real-Time Scoring',
      desc: 'Watch your points update as the episode unfolds.',
      gradient: 'from-yellow-400 to-orange-500',
    },
    {
      icon: BarChart3,
      title: '100+ Rules',
      desc: 'Every strategic move counts. We score it all.',
      gradient: 'from-burgundy-400 to-burgundy-600',
    },
    {
      icon: Users,
      title: 'Private Leagues',
      desc: 'Create leagues with friends. Up to 12 players.',
      gradient: 'from-blue-400 to-indigo-500',
    },
    {
      icon: Target,
      title: 'Weekly Picks',
      desc: 'New strategic decisions every episode.',
      gradient: 'from-green-400 to-emerald-500',
    },
    {
      icon: Shield,
      title: 'Fair Play',
      desc: 'Snake draft and waiver wire ensure balance.',
      gradient: 'from-purple-400 to-violet-500',
    },
    {
      icon: Trophy,
      title: 'Global Rankings',
      desc: 'Compete against thousands of superfans.',
      gradient: 'from-amber-400 to-orange-500',
    },
  ];

  return (
    <section ref={ref} className="py-20 bg-cream-100 relative overflow-hidden">
      {/* Parallax Background Elements */}
      <div
        ref={parallax1.elementRef}
        className="absolute top-20 -left-20 w-64 h-64 bg-burgundy-500/5 rounded-full blur-3xl pointer-events-none"
        style={{ transform: `translateY(${parallax1.offset}px)` }}
      />
      <div
        ref={parallax2.elementRef}
        className="absolute bottom-20 -right-20 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"
        style={{ transform: `translateY(${parallax2.offset}px)` }}
      />

      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="text-center mb-16">
          <h2
            className={`font-display text-4xl text-neutral-800 mb-4 transition-all duration-700 ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Why Superfans Love Us
          </h2>
          <p
            className={`text-lg text-neutral-600 max-w-2xl mx-auto transition-all duration-700 delay-100 ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Built by Survivor obsessives who&apos;ve watched every season.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <TiltCard key={i} className="h-full">
              <div
                className={`bg-white rounded-2xl p-6 shadow-card h-full transition-all duration-500 ${
                  isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Glowing Icon */}
                <div className="relative mb-4">
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-xl blur-lg opacity-20`}
                  />
                  <div
                    className={`relative w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                </div>

                <h3 className="font-semibold text-lg text-neutral-800 mb-2">{feature.title}</h3>
                <p className="text-neutral-600">{feature.desc}</p>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  const { user } = useAuth();
  const { ref, isInView } = useInView(0.3);
  const ctaParallax1 = useParallax(0.12);
  const ctaParallax2 = useParallax(-0.1);

  return (
    <section
      ref={ref}
      className="py-24 bg-gradient-to-br from-burgundy-600 via-burgundy-500 to-burgundy-700 relative overflow-hidden"
    >
      {/* Decorative Elements with Parallax */}
      <div
        ref={ctaParallax1.elementRef}
        className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
        style={{ transform: `translateY(${ctaParallax1.offset}px)` }}
      />
      <div
        ref={ctaParallax2.elementRef}
        className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"
        style={{ transform: `translateY(${ctaParallax2.offset}px)` }}
      />

      <div className="max-w-4xl mx-auto px-4 text-center relative">
        <div
          className={`transition-all duration-700 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Season 50: In the Hands of the Fans
          </div>

          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white mb-6 leading-tight">
            Ready to Play?
          </h2>

          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of superfans competing in the ultimate Survivor fantasy experience. Free
            to play, built for strategy.
          </p>

          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-burgundy-600 px-12 py-5 rounded-xl font-semibold text-lg hover:bg-cream-50 transition-all duration-300 hover:-translate-y-1 hover:scale-105 shadow-float group"
            >
              View Your Leagues
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-white text-burgundy-600 px-12 py-5 rounded-xl font-semibold text-lg hover:bg-cream-50 transition-all duration-300 hover:-translate-y-1 hover:scale-105 shadow-float group"
              >
                Join Now — It's Free
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Splash page for main domain (realitygamesfantasyleague.com)
function SplashPage() {
  const [scrollY, setScrollY] = useState(0);

  // Track scroll position for parallax
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const counter100 = useAnimatedCounter(100, 2000, true);

  return (
    <div className="min-h-[400vh] bg-cream-50 overflow-x-hidden relative">
      {/* Subtle parallax background orbs - very minimal */}
      <div
        className="fixed top-1/4 -right-32 w-[400px] h-[400px] bg-burgundy-500/5 rounded-full blur-3xl pointer-events-none"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      />
      <div
        className="fixed bottom-1/4 -left-32 w-[300px] h-[300px] bg-orange-400/5 rounded-full blur-3xl pointer-events-none"
        style={{ transform: `translateY(${-scrollY * 0.08}px)` }}
      />

      {/* Fixed container for scroll-based story */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="max-w-4xl mx-auto px-6 text-center pointer-events-auto">
          {/* Logo - Clean, no background effects */}
          <div
            className="flex justify-center mb-8 transition-all duration-300"
            style={{
              opacity: Math.max(0, 1 - scrollY / 400),
              transform: `translateY(${-scrollY * 0.3}px) scale(${Math.max(0.8, 1 - scrollY / 2000)})`,
            }}
          >
            <img
              src="/logo.png"
              alt="Reality Games Fantasy League"
              className="h-32 sm:h-40 lg:h-48 drop-shadow-lg"
            />
          </div>

          {/* Brand Name - Fades as you scroll */}
          <h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl text-neutral-800 leading-[1.1] tracking-tight mb-6 transition-all duration-300"
            style={{
              opacity: Math.max(0, 1 - scrollY / 300),
              transform: `translateY(${-scrollY * 0.2}px)`,
            }}
          >
            REALITY GAMES
            <br />
            <span className="text-burgundy-600">FANTASY LEAGUE</span>
          </h1>

          {/* Scroll indicator - only visible at top */}
          <div
            className="flex flex-col items-center text-neutral-400 transition-opacity duration-300"
            style={{ opacity: Math.max(0, 1 - scrollY / 150) }}
          >
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </div>

          {/* Story Block 1: The Hook */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-all duration-300"
            style={{
              opacity:
                Math.min(1, Math.max(0, (scrollY - 300) / 200)) *
                Math.max(0, 1 - (scrollY - 600) / 200),
              transform: `translateY(${Math.max(0, 40 - (scrollY - 300) * 0.1)}px)`,
            }}
          >
            <p className="text-2xl sm:text-3xl lg:text-4xl text-neutral-700 font-display leading-relaxed max-w-3xl mx-auto">
              Bored of the same old fantasy leagues where you pick one Survivor and pray for luck?
            </p>
          </div>

          {/* Story Block 2: The Solution */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-all duration-300"
            style={{
              opacity:
                Math.min(1, Math.max(0, (scrollY - 700) / 200)) *
                Math.max(0, 1 - (scrollY - 1000) / 200),
              transform: `translateY(${Math.max(0, 40 - (scrollY - 700) * 0.1)}px)`,
            }}
          >
            <p className="text-xl sm:text-2xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
              Get ready for something completely different.{' '}
              <span className="text-burgundy-600 font-semibold">Reality Games Fantasy League</span>{' '}
              is the first Survivor fantasy experience built by superfans, for superfans.
            </p>
          </div>

          {/* Story Block 3: The 100+ Rules */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-all duration-300"
            style={{
              opacity:
                Math.min(1, Math.max(0, (scrollY - 1100) / 200)) *
                Math.max(0, 1 - (scrollY - 1400) / 200),
              transform: `translateY(${Math.max(0, 40 - (scrollY - 1100) * 0.1)}px)`,
            }}
          >
            <p className="text-xl sm:text-2xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
              We&apos;ve created a scoring system with{' '}
              <span
                ref={counter100.ref}
                className="font-display text-4xl sm:text-5xl text-burgundy-600"
              >
                {counter100.count}+
              </span>{' '}
              game-tested rules that reward real strategy, not just luck.
            </p>
          </div>

          {/* Story Block 4: Every Move Counts */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-all duration-300"
            style={{
              opacity:
                Math.min(1, Math.max(0, (scrollY - 1500) / 200)) *
                Math.max(0, 1 - (scrollY - 1800) / 200),
              transform: `translateY(${Math.max(0, 40 - (scrollY - 1500) * 0.1)}px)`,
            }}
          >
            <p className="text-xl sm:text-2xl text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-6">
              Every vote, idol play, alliance move, and blindside can earn (or cost) you points.
            </p>
            <p className="text-lg text-neutral-500 italic">
              This league is for players who live and breathe Survivor.
            </p>
          </div>

          {/* Story Block 5: CTA - Join Season 50 */}
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-all duration-300"
            style={{
              opacity: Math.min(1, Math.max(0, (scrollY - 1900) / 200)),
              transform: `translateY(${Math.max(0, 40 - (scrollY - 1900) * 0.1)}px)`,
            }}
          >
            <p className="text-lg text-burgundy-600 font-semibold mb-3">
              Season 50: In the Hands of the Fans
            </p>
            <p className="text-xl sm:text-2xl text-neutral-700 mb-2">
              24 legendary castaways return.
            </p>
            <p className="text-neutral-500 mb-8">Premiere: February 25, 2026</p>

            <a
              href={`${SURVIVOR_APP_URL}/signup`}
              className="inline-flex items-center gap-2 bg-burgundy-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-burgundy-700 transition-all duration-300 hover:-translate-y-0.5 group"
            >
              Join Survivor Season 50
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </a>

            <p className="text-neutral-400 text-sm mt-4">
              Already have an account?{' '}
              <a href={`${SURVIVOR_APP_URL}/login`} className="text-burgundy-600 hover:underline">
                Log in
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50">
        {[0, 1, 2, 3, 4].map((i) => {
          const sectionStart = i * 400 + 100;
          const isActive = scrollY >= sectionStart && scrollY < sectionStart + 500;
          return (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isActive ? 'bg-burgundy-500 scale-125' : 'bg-neutral-300'
              }`}
            />
          );
        })}
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
            <span>•</span>
            <a
              href={`${SURVIVOR_APP_URL}/terms`}
              className="hover:text-burgundy-600 transition-colors"
            >
              Terms
            </a>
            <span>•</span>
            <a
              href={`${SURVIVOR_APP_URL}/contact`}
              className="hover:text-burgundy-600 transition-colors"
            >
              Contact
            </a>
          </div>
          <p className="text-xs text-neutral-400">
            &copy; 2025 Reality Games Fantasy League. Not affiliated with CBS or Survivor.
          </p>
        </div>
      </div>
    </div>
  );
}

// Full app home page for survivor subdomain
function SurvivorHome() {
  return (
    <div className="min-h-screen bg-cream-50">
      <Navigation />

      {/* Hero Slider */}
      <HeroSlider />

      {/* Stats Section */}
      <StatsSection />

      {/* Feature Blocks */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 space-y-32">
          <FeatureBlock
            title="Draft Your Dream Team"
            subtitle="SNAKE DRAFT"
            description="Pick 2 castaways in our async snake draft. Build your perfect alliance with players you believe in."
            features={[
              'Pick 2 castaways for your roster',
              'Snake draft format for fairness',
              'Deadline: March 2, 2026 at 8pm PST',
              'Auto-pick if you miss the deadline',
            ]}
            imagePosition="right"
            imageBg="bg-gradient-to-br from-cream-100 to-cream-200"
            icon={Users}
          />

          <FeatureBlock
            title="Make Strategic Weekly Picks"
            subtitle="WEEKLY STRATEGY"
            description="Choose which castaway to play each episode. Strategy meets prediction in this battle of wits."
            features={[
              'Select 1 castaway from your roster weekly',
              'Picks lock Wednesday at 3pm PST',
              'Points based on 100+ scoring rules',
              'Watch your strategy unfold live',
            ]}
            imagePosition="left"
            imageBg="bg-gradient-to-br from-burgundy-50 to-burgundy-100"
            icon={Target}
            delay={100}
          />

          <FeatureBlock
            title="Compete and Dominate"
            subtitle="CLIMB THE RANKS"
            description="Join private leagues with friends or compete in the global rankings. Every vote, idol, and blindside counts."
            features={[
              'Create private leagues (up to 12 players)',
              'Global leaderboard rankings',
              'Real-time scoring as episodes air',
              'Waiver wire for eliminated castaways',
            ]}
            imagePosition="right"
            imageBg="bg-gradient-to-br from-orange-50 to-amber-100"
            icon={Trophy}
            delay={200}
          />
        </div>
      </section>

      {/* Quick Features Grid with 3D Tilt Cards */}
      <TiltCardSection />

      {/* CTA Section */}
      <CTASection />

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
