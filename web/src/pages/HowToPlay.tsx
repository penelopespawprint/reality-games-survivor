import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  Calendar,
  Star,
  Award,
  BookOpen,
  ArrowRight,
  Target,
  Zap,
  Shield,
  Clock,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

export default function HowToPlay() {
  const { user } = useAuth();

  const steps = [
    {
      icon: Users,
      title: 'Join or Create a League',
      description:
        'Play with friends in a private league or join a public one. Each league has its own leaderboard and bragging rights.',
      details: [
        'Create a private league and invite friends with a code',
        'Join public leagues to compete with the community',
        'Play in multiple leagues with the same roster',
        'Everyone is automatically in the Global League',
      ],
    },
    {
      icon: Trophy,
      title: 'Rank Your Castaways',
      description:
        'Before the draft deadline, rank all castaways from 1-24. This determines who you get in the snake draft.',
      details: [
        'Rankings apply to ALL your leagues for the season',
        "Rank based on who you think will score the most points, not just who'll win",
        'Consider confessional counts, challenge ability, and edit visibility',
        'Lock in rankings by the deadline (after Episode 1 airs)',
      ],
    },
    {
      icon: Target,
      title: 'Get Your Team',
      description:
        'After the deadline, the system runs a snake draft. You get 2 castaways based on your draft position and rankings.',
      details: [
        'Draft positions are randomly assigned',
        'Snake draft means pick order reverses each round',
        "You'll get your highest-ranked available castaway each pick",
        'Your 2 castaways are your team for the entire season',
      ],
    },
    {
      icon: Calendar,
      title: 'Make Weekly Picks',
      description:
        'Each week, choose which of your 2 castaways to "play" for that episode. Only your picked castaway earns points.',
      details: [
        'Picks lock Wednesday at 3pm PST before the episode',
        'Analyze the edit, preview clips, and tribal dynamics',
        'If you forget, the system randomly picks from your roster',
        'Both castaways eliminated = torch snuffed (but you can still watch!)',
      ],
    },
    {
      icon: Star,
      title: 'Earn Points',
      description:
        'Your picked castaway earns (or loses) points based on what happens during the episode. See the full scoring rules for details.',
      details: [],
      linkTo: '/scoring',
      linkText: 'View Scoring Rules →',
    },
    {
      icon: Award,
      title: 'Win Your League',
      description:
        'The player with the most total points at the end of the season wins! Track your progress on the leaderboard.',
      details: [
        'Points accumulate across all episodes',
        'Leaderboard updates after each episode',
        'Compete for glory in multiple leagues',
        'Bragging rights last until next season!',
      ],
    },
  ];

  const strategies = [
    {
      icon: Zap,
      title: 'Study the Edit',
      description:
        'Castaways with more screen time and confessionals tend to score more points. Pay attention to who the editors are focusing on.',
    },
    {
      icon: Shield,
      title: 'Balance Risk',
      description:
        "Sometimes the safe pick isn't the best pick. A castaway in danger might score big if they survive or play an idol.",
    },
    {
      icon: Flame,
      title: 'Know the Meta',
      description:
        'Challenge beasts score consistently. Strategic players score in bursts. Social players accumulate over time.',
    },
    {
      icon: Clock,
      title: 'Think Long-Term',
      description:
        "Don't just think about this week. Consider who will make the merge, who has idol-finding potential, who might win.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />

      {/* Hero Header */}
      <div className="px-6 py-10 text-center bg-gradient-to-b from-burgundy-50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="h-9 w-9 text-burgundy-500" />
            <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-800">
              How to Play
            </h1>
          </div>
          <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
            Fantasy Survivor for people who actually watch Survivor. Real strategy. No luck
            required.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Steps Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold text-neutral-800 mb-8 text-center">
            The Game in 6 Steps
          </h2>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden"
              >
                <div className="p-6 md:p-8">
                  <div className="flex items-start gap-4 md:gap-6">
                    <div className="flex-shrink-0 w-14 h-14 bg-burgundy-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <step.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-burgundy-500 font-bold text-sm">
                          Step {index + 1}
                        </span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-display font-bold text-neutral-800 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-neutral-600 mb-4">{step.description}</p>
                      {step.details.length > 0 ? (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {step.details.map((detail, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {'linkTo' in step && step.linkTo && (
                        <Link
                          to={step.linkTo}
                          className="inline-flex items-center gap-2 mt-2 text-burgundy-600 hover:text-burgundy-700 font-medium"
                        >
                          {step.linkText || 'Learn more'}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Strategy Tips */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold text-neutral-800 mb-8 text-center">
            Strategy Tips
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.title}
                className="bg-white rounded-2xl shadow-card border border-cream-200 p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <strategy.icon className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-neutral-800 mb-1">
                      {strategy.title}
                    </h3>
                    <p className="text-neutral-600 text-sm">{strategy.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold text-neutral-800 mb-8 text-center">
            Learn More
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/scoring"
              className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 hover:shadow-card-hover transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center">
                    <Star className="h-6 w-6 text-burgundy-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-neutral-800">Scoring Rules</h3>
                    <p className="text-neutral-500 text-sm">100+ ways to earn points</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-burgundy-500 transition-colors" />
              </div>
            </Link>
            <Link
              to="/timeline"
              className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 hover:shadow-card-hover transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-neutral-800">Weekly Timeline</h3>
                    <p className="text-neutral-500 text-sm">Know every deadline</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-amber-500 transition-colors" />
              </div>
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center pb-16">
          <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-8 md:p-12 text-white shadow-lg">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
              Ready to Play?
            </h2>
            <p className="text-burgundy-100 mb-8 max-w-lg mx-auto text-lg">
              Join Season 50: In the Hands of the Fans and prove you know more about Survivor
              strategy than your friends.
            </p>
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-white text-burgundy-600 font-bold px-8 py-4 rounded-xl hover:bg-cream-100 transition-colors text-lg"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-white text-burgundy-600 font-bold px-8 py-4 rounded-xl hover:bg-cream-100 transition-colors text-lg"
              >
                Join Now - It's Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
