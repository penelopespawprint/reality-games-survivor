import { Trophy, Users, Calendar, Star, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
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
        'Create a private league with friends or join an existing one using an invite code. Leagues can have up to 12 players. Optional charity donations make competition meaningful — the winner recommends where the pool goes!',
    },
    {
      icon: Trophy,
      title: 'Draft Your Team',
      description:
        "Before the season premiere, you'll rank all 18 castaways based on who you think will go far. Your rankings are used across all your leagues in a snake draft format — if you're pick 5, you get whoever is highest on YOUR list that hasn't been taken. Study the cast bios, watch pre-season interviews, and trust your Survivor instincts. Consider edit visibility (who gets confessionals?), challenge prowess (physical and puzzle skills), and social game (who can build alliances?). Your 2 best available castaways become your roster for the season.",
    },
    {
      icon: Calendar,
      title: 'Make Weekly Picks',
      description:
        'Each week, choose which of your 2 castaways to play. Picks lock at 3pm PST on Wednesdays before the episode airs.',
    },
    {
      icon: Star,
      title: 'Earn Points',
      description:
        'Your picked castaway earns points based on what happens in the episode. Every idol play, challenge win, and strategic move counts. See the full list on our Scoring Rules page.',
    },
    {
      icon: Award,
      title: 'Win Your League',
      description:
        'Accumulate the most points over the season to win your league and claim bragging rights until next season!',
    },
  ];

  const timeline = [
    { day: 'Wednesday 3pm', event: 'Picks lock for the week' },
    { day: 'Wednesday 8pm', event: 'Episode airs (live scoring!)' },
    { day: 'Friday 12pm', event: 'Official results posted' },
    { day: 'Saturday 12pm', event: "Next week's picks open" },
    { day: 'Wednesday 3pm', event: 'Picks lock, cycle repeats' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />

      {/* Header */}
      <div className="px-6 py-12 text-center">
        <h1 className="text-4xl font-display font-bold text-neutral-800 mb-4">How to Play</h1>
        <p className="text-neutral-500 text-lg max-w-2xl mx-auto">
          Fantasy Survivor for people who actually watch Survivor. 100+ rules. Real strategy. No
          luck required.
        </p>
      </div>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="bg-white rounded-2xl shadow-card p-6 border border-cream-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-burgundy-500 rounded-full flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-burgundy-500 font-bold text-sm">Step {index + 1}</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-neutral-500">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Timeline */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-display font-bold text-neutral-800 mb-6 text-center">
          Weekly Timeline
        </h2>
        <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
          <div className="space-y-4">
            {timeline.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-32 text-burgundy-500 font-medium text-sm flex-shrink-0">
                  {item.day}
                </div>
                <div className="flex-1 flex items-center">
                  <div className="w-3 h-3 bg-burgundy-500 rounded-full" />
                  <div className="flex-1 h-px bg-cream-300 ml-2" />
                </div>
                <div className="flex-1 text-neutral-700">{item.event}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scoring Rules Link */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <Link
          to="/scoring"
          className="block bg-white rounded-2xl shadow-card p-6 border border-cream-200 hover:shadow-card-hover transition-all text-center"
        >
          <Star className="h-8 w-8 text-burgundy-500 mx-auto mb-3" />
          <h3 className="text-lg font-display font-bold text-neutral-800 mb-2">
            View All Scoring Rules
          </h3>
          <p className="text-neutral-500">
            See exactly how points are earned and lost for every game action.
          </p>
        </Link>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 pb-16 text-center">
        {user ? (
          <Link to="/dashboard" className="btn btn-primary text-lg px-8 py-3">
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link to="/signup" className="btn btn-primary text-lg px-8 py-3">
              Join Season 50: In the Hands of the Fans
            </Link>
            <p className="mt-4 text-neutral-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-burgundy-500 hover:text-burgundy-600 font-medium">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
