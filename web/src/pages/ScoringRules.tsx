import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

// Scoring rules organized by category with exact point values
const SCORING_RULES = [
  {
    category: 'Pre-Merge Team Reward and Immunity Challenge Scoring',
    rules: [
      {
        points: 1,
        text: "point if your player's team wins a reward challenge (if three teams, get 1st or 2nd)",
      },
      {
        points: -1,
        text: 'point if your player sits out of a reward, immunity or combined immunity/reward challenge',
      },
      {
        points: 1,
        text: 'point if your player gives up their chance for reward to someone else before the challenge; not penalized for sitting out',
      },
    ],
  },
  {
    category: 'Pre-Merge Tribal Council Scoring',
    rules: [
      { points: 5, text: "points if your player doesn't go to tribal council" },
      { points: 5, text: 'points if your player goes to tribal council but does not get snuffed' },
      {
        points: -1,
        text: 'point for each vote your player receives to vote them out and does count.',
      },
      {
        points: 1,
        text: 'point for each vote your players receives but does not count. (eg Player is now immune after votes were cast.)',
      },
    ],
  },
  {
    category: 'Post-Merge Reward and Individual Immunity Challenge Scoring',
    rules: [
      {
        points: 1,
        text: 'point if your player gives up their chance for reward to someone else before the challenge; not penalized for sitting out',
      },
      {
        points: -1,
        text: 'if your player is the first individual eliminated in an individual reward or immunity challenge.',
      },
    ],
  },
  {
    category: 'Advantages Scoring',
    rules: [
      {
        points: -1,
        text: 'point if your player is on a journey, must play (no choice), and incurs a disadvantage',
      },
      {
        points: -1,
        text: "point if your player finds a hidden advantage but 'plays it safe' and puts it back",
      },
      {
        points: -3,
        text: 'points if your player uses a real or fake advantage unsuccessfully for themselves or another player',
      },
      {
        points: -1,
        text: "point if your player finds a fake advantage and believes it is real (eg 'It's a fucking stick!' incident (if the stick was an advantage rather than an idol) would yield Jason -1 because he believed it was real but yield Eliza 0 because she did not believe it was real)",
      },
    ],
  },
  {
    category: 'Hidden Immunity Idols Scoring',
    rules: [
      {
        points: 1,
        text: 'point if your player gives their hidden immunity idol to another player',
      },
      { points: 5, text: 'points if your player uses their Shot in the Dark successfully' },
    ],
  },
  {
    category: 'Random Scoring',
    rules: [
      {
        points: 1,
        text: "point for wardrobe malfunction (must be more than blurring of a crack or through-the-pants; we're talking boobs fully popping out or Free Willy)",
      },
      { points: -1, text: 'point for crying/brink of tears for negative reasons (upset, bullied)' },
      {
        points: 2,
        text: "points if your player secretly eats food and doesn't share with the entire tribe",
      },
    ],
  },
  {
    category: 'Final Three',
    rules: [
      { points: 2, text: 'points if you are chosen by another castaway to be in the final three' },
      { points: 2, text: 'points for each vote your player receives in the final vote' },
      { points: 10, text: 'if your player wins the season' },
    ],
  },
];

export default function ScoringRules() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navigation />

      {/* Header */}
      <div className="px-6 py-10 text-center bg-gradient-to-b from-burgundy-50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="h-9 w-9 text-burgundy-500" />
            <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-800">
              Scoring Rules
            </h1>
          </div>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Earn and lose points based on what your castaways do each episode.
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
                      className={`font-mono font-bold text-lg min-w-[50px] text-right ${
                        rule.points >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {rule.points >= 0 ? '+' : ''}
                      {rule.points}
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
