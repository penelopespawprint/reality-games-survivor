import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Trophy, Users, Calendar, Star, Flame, Target, TrendingUp, Zap } from 'lucide-react';

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

const features = [
  {
    icon: Target,
    title: '100+ Scoring Rules',
    description: 'Every idol play, challenge win, and blindside counts. Real strategy rewarded.',
    color: 'burgundy',
  },
  {
    icon: Users,
    title: 'Draft Your Team',
    description: 'Pick 2 castaways in our snake draft. Build your perfect alliance.',
    color: 'green',
  },
  {
    icon: Calendar,
    title: 'Weekly Picks',
    description: 'Choose which castaway to play each episode. Strategy meets prediction.',
    color: 'amber',
  },
  {
    icon: Trophy,
    title: 'Compete & Win',
    description: 'Private leagues with friends or join global rankings. Bragging rights await.',
    color: 'orange',
  },
];

const stats = [
  { label: 'Scoring Rules', value: '100+' },
  { label: 'Castaways to Draft', value: '18' },
  { label: 'Episodes', value: '13' },
  { label: 'Max League Size', value: '12' },
];

export function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-radial from-burgundy-100/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute left-8 top-32 opacity-5 hidden xl:block">
          <TorchIcon className="h-96" />
        </div>
        <div className="absolute right-8 top-32 opacity-5 hidden xl:block">
          <TorchIcon className="h-96" />
        </div>

        <div className="max-w-6xl mx-auto px-4 py-20 lg:py-28">
          <div className="text-center animate-fade-in">
            {/* Main torch */}
            <div className="flex justify-center mb-8">
              <TorchIcon className="h-28 drop-shadow-lg" />
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl text-neutral-800 leading-tight tracking-tight mb-6">
              SURVIVOR FANTASY LEAGUE
            </h1>

            <p className="text-xl sm:text-2xl text-neutral-600 max-w-3xl mx-auto leading-relaxed mb-4">
              Bored of fantasy leagues where you pick one Survivor and pray for luck?
            </p>

            <p className="text-lg sm:text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed mb-10">
              We built a scoring system with{' '}
              <span className="font-semibold text-burgundy-600">100+ game-tested rules</span>{' '}
              that reward real strategy — not just luck.
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
                    JOIN NOW
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

            <p className="text-sm text-neutral-500 tracking-wide">
              <span className="font-semibold text-burgundy-600">Season 50: In the Hands of the Fans</span>
              <span className="mx-2">·</span>
              Registration opens December 19, 2025
            </p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-gradient-to-r from-burgundy-600 to-burgundy-700 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-display font-bold text-white">{stat.value}</p>
                <p className="text-burgundy-200 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-4xl text-neutral-800 mb-4">
              Fantasy Survivor. Done Right.
            </h2>
            <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
              Built by superfans who've watched every season. Every strategic move counts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 border border-cream-200 group hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-${feature.color}-100 group-hover:bg-${feature.color}-500 transition-colors`}>
                  <feature.icon className={`h-7 w-7 text-${feature.color}-600 group-hover:text-white transition-colors`} />
                </div>
                <h3 className="font-display font-bold text-lg text-neutral-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="py-20 lg:py-28 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-3xl lg:text-4xl text-neutral-800 mb-6">
                Draft. Pick. Dominate.
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-burgundy-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800 mb-1">Join a League</h3>
                    <p className="text-neutral-500 text-sm">Create your own or join with friends using an invite code.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-burgundy-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800 mb-1">Draft Your Team</h3>
                    <p className="text-neutral-500 text-sm">Rank all 18 castaways. Snake draft gives you 2 for your roster.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-burgundy-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800 mb-1">Play Weekly</h3>
                    <p className="text-neutral-500 text-sm">Each Wednesday, pick which castaway scores for you that episode.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-burgundy-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800 mb-1">Win Glory</h3>
                    <p className="text-neutral-500 text-sm">Most points at season's end wins. Loser snuffs their own torch.</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Link
                  to="/how-to-play"
                  className="text-burgundy-600 font-semibold hover:text-burgundy-700 transition-colors inline-flex items-center gap-2"
                >
                  Learn more about scoring
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-burgundy-500 to-burgundy-700 rounded-3xl p-8 text-white shadow-elevated">
                <div className="flex items-center gap-3 mb-6">
                  <Flame className="h-8 w-8 text-orange-400" />
                  <div>
                    <p className="font-display text-xl">Sample Scoring</p>
                    <p className="text-burgundy-200 text-sm">Episode 5 Highlights</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { rule: 'Found Hidden Immunity Idol', points: 15 },
                    { rule: 'Won Individual Immunity', points: 10 },
                    { rule: 'Received Votes (but survived)', points: -2 },
                    { rule: 'Confessional Appearance', points: 1 },
                    { rule: 'Orchestrated Blindside', points: 12 },
                  ].map((item) => (
                    <div key={item.rule} className="flex justify-between items-center py-2 border-b border-white/20 last:border-0">
                      <span className="text-burgundy-100">{item.rule}</span>
                      <span className={`font-bold ${item.points > 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {item.points > 0 ? '+' : ''}{item.points}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center">
                  <span className="font-semibold">Episode Total</span>
                  <span className="text-2xl font-display font-bold text-green-300">+36</span>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-burgundy-400/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <TorchIcon className="h-20" />
          </div>
          <h2 className="font-display text-3xl lg:text-5xl text-neutral-800 mb-4">
            Ready to Play?
          </h2>
          <p className="text-lg text-neutral-500 mb-8 max-w-xl mx-auto">
            Join the fantasy league that Survivor deserves. Season 50 awaits.
          </p>
          {!user && (
            <Link
              to="/signup"
              className="btn btn-primary text-xl px-12 py-5 shadow-float hover:shadow-elevated-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              Join Season 50
            </Link>
          )}
          {user && (
            <Link
              to="/dashboard"
              className="btn btn-primary text-xl px-12 py-5 shadow-float hover:shadow-elevated-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              Go to Dashboard
            </Link>
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
