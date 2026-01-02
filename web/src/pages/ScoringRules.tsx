import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Trophy,
  Users,
  Flame,
  Target,
  Gem,
  Star,
  Award,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

// Category display order and metadata with examples
const CATEGORIES = [
  {
    name: 'Pre-Merge Team Reward and Immunity Challenge Scoring',
    icon: Trophy,
    color: 'green',
    description: 'Points for team challenges before the merge',
    examples: [
      {
        text: "point if your player's team wins a reward challenge (if three teams, get 1st or 2nd)",
        positive: true,
      },
      {
        text: 'point if your player sits out of a reward, immunity or combined immunity/reward challenge',
        positive: false,
      },
      {
        text: 'point if your player gives up their chance for reward to someone else before the challenge; not penalized for sitting out',
        positive: true,
      },
    ],
  },
  {
    name: 'Pre-Merge Tribal Council Scoring',
    icon: Users,
    color: 'blue',
    description: 'Points at tribal council before the merge',
    examples: [
      { text: "points if your player doesn't go to tribal council", positive: true },
      {
        text: 'points if your player goes to tribal council but does not get snuffed',
        positive: true,
      },
      {
        text: 'point for each vote your player receives to vote them out and does count.',
        positive: false,
      },
      {
        text: 'point for each vote your players receives but does not count. (eg Player is now immune after votes were cast.)',
        positive: true,
      },
    ],
  },
  {
    name: 'Post-Merge Reward and Individual Immunity Challenge Scoring',
    icon: Award,
    color: 'purple',
    description: 'Points for individual challenges after the merge',
    examples: [
      {
        text: 'point if your player gives up their chance for reward to someone else before the challenge; not penalized for sitting out',
        positive: true,
      },
      {
        text: 'if your player is the first individual eliminated in an individual reward or immunity challenge.',
        positive: false,
      },
    ],
  },
  {
    name: 'Advantages Scoring',
    icon: Target,
    color: 'orange',
    description: 'Points related to game advantages',
    examples: [
      {
        text: 'point if your player is on a journey, must play (no choice), and incurs a disadvantage',
        positive: false,
      },
      {
        text: "point if your player finds a hidden advantage but 'plays it safe' and puts it back",
        positive: false,
      },
      {
        text: 'points if your player uses a real or fake advantage unsuccessfully for themselves or another player',
        positive: false,
      },
      {
        text: "point if your player finds a fake advantage and believes it is real (eg 'It's a fucking stick!' incident (if the stick was an advantage rather than an idol) would yield Jason -1 because he believed it was real but yield Eliza 0 because she did not believe it was real)",
        positive: false,
      },
    ],
  },
  {
    name: 'Hidden Immunity Idols Scoring',
    icon: Gem,
    color: 'yellow',
    description: 'Points for finding and playing idols',
    examples: [
      {
        text: 'point if your player gives their hidden immunity idol to another player',
        positive: true,
      },
      { text: 'points if your player uses their Shot in the Dark successfully', positive: true },
    ],
  },
  {
    name: 'Random Scoring',
    icon: Star,
    color: 'teal',
    description: 'Miscellaneous scoring events',
    examples: [
      {
        text: "point for wardrobe malfunction (must be more than blurring of a crack or through-the-pants; we're talking boobs fully popping out or Free Willy)",
        positive: true,
      },
      {
        text: 'point for crying/brink of tears for negative reasons (upset, bullied)',
        positive: false,
      },
      {
        text: "points if your player secretly eats food and doesn't share with the entire tribe",
        positive: true,
      },
    ],
  },
  {
    name: 'Final Three',
    icon: Flame,
    color: 'gold',
    description: 'Points for making it to the end',
    examples: [
      {
        text: 'points if you are chosen by another castaway to be in the final three',
        positive: true,
      },
      { text: 'points for each vote your player receives in the final vote', positive: true },
      { text: 'if your player wins the season', positive: true },
    ],
  },
];

export default function ScoringRules() {
  const { user } = useAuth();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    return CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: true }), {});
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const expandAll = () => {
    setExpandedCategories(CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: true }), {}));
  };

  const collapseAll = () => {
    setExpandedCategories(CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: false }), {}));
  };

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
            Earn and lose points based on what your castaways do each episode. With over 100+ rules
            and a decade of Survivor knowledge, our scoring system is unmatched.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-6xl mx-auto px-6 mb-6">
        <div className="flex justify-center gap-3">
          <button
            onClick={expandAll}
            className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
          >
            Expand All
          </button>
          <span className="text-neutral-300">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategories[category.name];

            const bgColorClass =
              category.color === 'orange'
                ? 'bg-orange-100'
                : category.color === 'blue'
                  ? 'bg-blue-100'
                  : category.color === 'green'
                    ? 'bg-green-100'
                    : category.color === 'purple'
                      ? 'bg-purple-100'
                      : category.color === 'red'
                        ? 'bg-red-100'
                        : category.color === 'teal'
                          ? 'bg-teal-100'
                          : category.color === 'yellow'
                            ? 'bg-yellow-100'
                            : category.color === 'indigo'
                              ? 'bg-indigo-100'
                              : category.color === 'gold'
                                ? 'bg-amber-100'
                                : 'bg-neutral-100';

            const textColorClass =
              category.color === 'orange'
                ? 'text-orange-600'
                : category.color === 'blue'
                  ? 'text-blue-600'
                  : category.color === 'green'
                    ? 'text-green-600'
                    : category.color === 'purple'
                      ? 'text-purple-600'
                      : category.color === 'red'
                        ? 'text-red-600'
                        : category.color === 'teal'
                          ? 'text-teal-600'
                          : category.color === 'yellow'
                            ? 'text-yellow-600'
                            : category.color === 'indigo'
                              ? 'text-indigo-600'
                              : category.color === 'gold'
                                ? 'text-amber-600'
                                : 'text-neutral-600';

            return (
              <div
                key={category.name}
                className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-cream-50 transition-colors"
                >
                  <div className={`p-2 rounded-xl ${bgColorClass}`}>
                    <Icon className={`h-5 w-5 ${textColorClass}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-display font-bold text-neutral-800">
                      {category.name}
                    </h3>
                    {!isExpanded && (
                      <p className="text-neutral-500 text-xs">{category.description}</p>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-neutral-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-neutral-400" />
                  )}
                </button>

                {/* Expanded Content: Description + Examples */}
                {isExpanded && (
                  <div className="border-t border-cream-200">
                    {/* Description */}
                    <div className="px-5 py-3 bg-cream-50 border-b border-cream-100">
                      <p className="text-neutral-600 text-sm">{category.description}</p>
                    </div>
                    {/* Examples List */}
                    <div className="divide-y divide-cream-100">
                      {category.examples.map((example, i) => (
                        <div
                          key={i}
                          className="px-5 py-2.5 flex items-start gap-3 hover:bg-cream-50 transition-colors"
                        >
                          <span
                            className={`font-bold text-lg flex-shrink-0 w-6 text-center ${
                              example.positive ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {example.positive ? '+' : '-'}
                          </span>
                          <p className="text-neutral-700 text-sm flex-1">{example.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <div className="bg-cream-100 rounded-2xl p-6 border border-cream-200">
          <h3 className="font-display font-bold text-neutral-800 mb-2">
            Why don't you show exact point values?
          </h3>
          <p className="text-neutral-600 text-sm">
            Our scoring system is carefully balanced to reward strategic gameplay. We keep the exact
            point values private to prevent gaming the system and to keep the competition fair.
            Focus on drafting well-rounded players who are likely to go deep in the game!
          </p>
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
