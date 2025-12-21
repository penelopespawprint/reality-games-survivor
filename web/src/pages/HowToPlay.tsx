import { Trophy, Users, Calendar, Star, Zap, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowToPlay() {
  const steps = [
    {
      icon: Users,
      title: 'Join or Create a League',
      description: 'Create a private league with friends or join an existing one using an invite code. Leagues can have up to 12 players.',
    },
    {
      icon: Trophy,
      title: 'Draft Your Team',
      description: 'Snake draft format: pick 2 castaways for your roster. Strategy matters — consider edit visibility, challenge prowess, and social game.',
    },
    {
      icon: Calendar,
      title: 'Make Weekly Picks',
      description: 'Each week, choose which of your 2 castaways to play. Picks lock at 3pm PST on Wednesdays before the episode airs.',
    },
    {
      icon: Star,
      title: 'Earn Points',
      description: 'Your picked castaway earns points based on 100+ scoring rules. Every idol play, challenge win, and strategic move counts.',
    },
    {
      icon: Zap,
      title: 'Waiver Wire',
      description: 'When your castaway gets eliminated, submit waiver rankings to claim a replacement. Last place gets first pick (inverse standings).',
    },
    {
      icon: Award,
      title: 'Win Your League',
      description: 'Accumulate the most points over the season to win your league and claim bragging rights until next season!',
    },
  ];

  const timeline = [
    { day: 'Wednesday 3pm', event: 'Picks lock for the week' },
    { day: 'Wednesday 8pm', event: 'Episode airs (live scoring!)' },
    { day: 'Friday 12pm', event: 'Official results posted' },
    { day: 'Saturday 12pm', event: 'Waiver window opens' },
    { day: 'Wednesday 3pm', event: 'Waiver window closes, next picks due' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900">
      {/* Header */}
      <div className="px-6 py-12 text-center">
        <h1 className="text-4xl font-display font-bold text-white mb-4">
          How to Play
        </h1>
        <p className="text-burgundy-200 text-lg max-w-2xl mx-auto">
          Fantasy Survivor for people who actually watch Survivor. 100+ rules. Real strategy. No luck required.
        </p>
      </div>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gold-500 rounded-full flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-burgundy-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gold-500 font-bold text-sm">Step {index + 1}</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-burgundy-200">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Timeline */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-display font-bold text-white mb-6 text-center">
          Weekly Timeline
        </h2>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="space-y-4">
            {timeline.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-32 text-gold-500 font-medium text-sm flex-shrink-0">
                  {item.day}
                </div>
                <div className="flex-1 flex items-center">
                  <div className="w-3 h-3 bg-gold-500 rounded-full" />
                  <div className="flex-1 h-px bg-burgundy-600 ml-2" />
                </div>
                <div className="flex-1 text-white">{item.event}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Rules */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-display font-bold text-white mb-6 text-center">
          Key Rules
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h3 className="text-gold-500 font-bold mb-2">Roster Size</h3>
            <p className="text-burgundy-200 text-sm">2 castaways per player, drafted via snake format</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h3 className="text-gold-500 font-bold mb-2">Weekly Pick</h3>
            <p className="text-burgundy-200 text-sm">Choose 1 castaway to play each week</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h3 className="text-gold-500 font-bold mb-2">Waiver Priority</h3>
            <p className="text-burgundy-200 text-sm">Inverse standings — last place picks first</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h3 className="text-gold-500 font-bold mb-2">Auto-Pick</h3>
            <p className="text-burgundy-200 text-sm">Miss the deadline? System picks your highest-ranked active</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 pb-16 text-center">
        <Link
          to="/signup"
          className="inline-block bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold py-3 px-8 rounded-lg transition-colors"
        >
          Join Season 50
        </Link>
        <p className="mt-4 text-burgundy-300 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-gold-400 hover:text-gold-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
