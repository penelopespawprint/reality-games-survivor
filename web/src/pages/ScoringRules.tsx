import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

// Scoring rules organized by category - positive = true means earn points, false means lose points
const SCORING_RULES = [
  {
    category: 'Pre-Merge Team Reward and Immunity Challenge Scoring',
    rules: [
      {
        positive: true,
        text: "Your player's team wins a reward challenge (if three teams, get 1st or 2nd)",
      },
      {
        positive: false,
        text: 'Your player sits out of a reward, immunity or combined immunity/reward challenge',
      },
      {
        positive: true,
        text: 'Your player gives up their chance for reward to someone else before the challenge; not penalized for sitting out',
      },
    ],
  },
  {
    category: 'Pre-Merge Tribal Council Scoring',
    rules: [
      { positive: true, text: "Your player doesn't go to tribal council" },
      { positive: true, text: 'Your player goes to tribal council but does not get snuffed' },
      {
        positive: false,
        text: 'Each vote your player receives to vote them out and does count',
      },
      {
        positive: true,
        text: 'Each vote your player receives but does not count (eg Player is now immune after votes were cast)',
      },
    ],
  },
  {
    category: 'Post-Merge Reward and Individual Immunity Challenge Scoring',
    rules: [
      {
        positive: true,
        text: 'Your player gives up their chance for reward to someone else before the challenge; not penalized for sitting out',
      },
      {
        positive: false,
        text: 'Your player is the first individual eliminated in an individual reward or immunity challenge',
      },
    ],
  },
  {
    category: 'Advantages Scoring',
    rules: [
      {
        positive: false,
        text: 'Your player is on a journey, must play (no choice), and incurs a disadvantage',
      },
      {
        positive: false,
        text: "Your player finds a hidden advantage but 'plays it safe' and puts it back",
      },
      {
        positive: false,
        text: 'Your player uses a real or fake advantage unsuccessfully for themselves or another player',
      },
      {
        positive: false,
        text: "Your player finds a fake advantage and believes it is real (eg 'It's a fucking stick!' incident (if the stick was an advantage rather than an idol) would yield Jason -1 because he believed it was real but yield Eliza 0 because she did not believe it was real)",
      },
    ],
  },
  {
    category: 'Hidden Immunity Idols Scoring',
    rules: [
      {
        positive: true,
        text: 'Your player gives their hidden immunity idol to another player',
      },
      { positive: true, text: 'Your player uses their Shot in the Dark successfully' },
    ],
  },
  {
    category: 'Random Scoring',
    rules: [
      {
        positive: true,
        text: "Wardrobe malfunction (must be more than blurring of a crack or through-the-pants; we're talking boobs fully popping out or Free Willy)",
      },
      { positive: false, text: 'Crying/brink of tears for negative reasons (upset, bullied)' },
      {
        positive: true,
        text: "Your player secretly eats food and doesn't share with the entire tribe",
      },
    ],
  },
  {
    category: 'Final Three',
    rules: [
      { positive: true, text: 'You are chosen by another castaway to be in the final three' },
      { positive: true, text: 'Each vote your player receives in the final vote' },
      { positive: true, text: 'Your player wins the season' },
    ],
  },
];

export default function ScoringRules() {
  const { user } = useAuth();
  const { getCopy } = useSiteCopy();

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navigation />

      {/* Header */}
      <div className="px-6 py-10 text-center bg-gradient-to-b from-burgundy-50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="h-9 w-9 text-burgundy-500" />
            <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-800">
              {getCopy('scoring.header.title', 'Scoring Rules')}
            </h1>
          </div>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            {getCopy(
              'scoring.header.subtitle',
              'See how castaways earn and lose points each episode'
            )}
            are added each season.
          </p>
        </div>
      </div>

      {/* Scoring Rules */}
      <div className="max-w-4xl mx-auto px-6 pb-12 flex-1">
        <div className="space-y-8">
          {SCORING_RULES.map((section) => (
            <div
              key={section.category}
              className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden"
            >
              {/* Category Header */}
              <div className="px-6 py-4 bg-burgundy-50 border-b border-burgundy-100">
                <h2 className="text-lg font-display font-bold text-burgundy-800">
                  {section.category}
                </h2>
              </div>

              {/* Rules List */}
              <div className="divide-y divide-cream-100">
                {section.rules.map((rule, i) => (
                  <div key={i} className="px-6 py-4 flex items-start gap-4">
                    <span
                      className={`font-bold text-xl min-w-[30px] text-center ${
                        rule.positive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {rule.positive ? '+' : '−'}
                    </span>
                    <p className="text-neutral-700 flex-1">{rule.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 pb-16 text-center">
        <div className="bg-burgundy-500 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-display font-bold mb-4">
            Ready to Put Your Survivor Knowledge to the Test?
          </h2>
          <p className="text-burgundy-100 mb-6 max-w-lg mx-auto">
            Join Season 50 and prove you know more about Survivor strategy than your friends.
          </p>
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-burgundy-600 font-bold px-8 py-3 rounded-xl hover:bg-cream-100 transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-white text-burgundy-600 font-bold px-8 py-3 rounded-xl hover:bg-cream-100 transition-colors"
            >
              Join Now - It's Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
