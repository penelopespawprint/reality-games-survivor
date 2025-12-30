import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Trophy,
  Users,
  Flame,
  MessageCircle,
  Target,
  Gem,
  Star,
  Award,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

// Category display order and metadata with examples
const CATEGORIES = [
  {
    name: 'Survival',
    icon: Flame,
    color: 'orange',
    description: 'Points for staying in the game',
    examples: [
      { text: 'Survive the episode without being voted out', positive: true },
      { text: 'Make it to the merge', positive: true },
      { text: 'Reach the Final Tribal Council', positive: true },
      { text: 'Win the title of Sole Survivor', positive: true },
    ],
  },
  {
    name: 'Tribal Council',
    icon: Users,
    color: 'blue',
    description: 'Points through voting and surviving votes',
    examples: [
      { text: 'Vote for the person who gets eliminated', positive: true },
      { text: 'Receive votes but survive', positive: true },
      { text: 'Get blindsided (eliminated with an idol in pocket)', positive: false },
      { text: 'Vote incorrectly', positive: false },
    ],
  },
  {
    name: 'Pre-Merge Challenges',
    icon: Trophy,
    color: 'green',
    description: 'Tribal immunity and reward challenges',
    examples: [
      { text: 'Tribe wins immunity challenge', positive: true },
      { text: 'Tribe wins reward challenge', positive: true },
      { text: 'Individual standout performance in tribal challenge', positive: true },
      { text: 'Sit out of a challenge', positive: false },
    ],
  },
  {
    name: 'Post-Merge Challenges',
    icon: Award,
    color: 'purple',
    description: 'Individual immunity and reward challenges',
    examples: [
      { text: 'Win individual immunity', positive: true },
      { text: 'Win individual reward', positive: true },
      { text: 'Win the final immunity challenge', positive: true },
      { text: 'Come in second place in individual immunity', positive: true },
    ],
  },
  {
    name: 'Strategic Play',
    icon: Target,
    color: 'red',
    description: 'Big moves and game manipulation',
    examples: [
      { text: 'Orchestrate a blindside', positive: true },
      { text: 'Successfully flip on your alliance', positive: true },
      { text: 'Convince someone to play (or not play) their idol', positive: true },
      { text: 'Get caught in a lie', positive: false },
    ],
  },
  {
    name: 'Social Game',
    icon: MessageCircle,
    color: 'teal',
    description: 'Relationships and jury management',
    examples: [
      { text: 'Shown building a strong alliance', positive: true },
      { text: 'Mediate conflict between other players', positive: true },
      { text: 'Receive votes at Final Tribal Council', positive: true },
      { text: 'Get into a public argument', positive: false },
    ],
  },
  {
    name: 'Idols & Advantages',
    icon: Gem,
    color: 'yellow',
    description: 'Finding and playing advantages',
    examples: [
      { text: 'Find a hidden immunity idol', positive: true },
      { text: 'Successfully play an idol to save yourself', positive: true },
      { text: 'Play an idol for another player', positive: true },
      { text: 'Find or win any advantage', positive: true },
      { text: 'Waste an idol (play it but no votes against you)', positive: false },
    ],
  },
  {
    name: 'Confessionals & Screen Time',
    icon: MessageCircle,
    color: 'indigo',
    description: 'On-screen presence and memorable moments',
    examples: [
      { text: 'Have a confessional during the episode', positive: true },
      { text: 'Deliver a memorable or viral moment', positive: true },
      { text: 'Get significant screen time', positive: true },
      { text: 'Shown crying (context matters!)', positive: true },
    ],
  },
  {
    name: 'Bonus & Special',
    icon: Star,
    color: 'gold',
    description: 'Special achievements and milestones',
    examples: [
      { text: 'Win fan favorite / Sprint Player of the Season', positive: true },
      { text: 'Make a move that significantly changes the game', positive: true },
      { text: 'Perfect game (no votes against, unanimous win)', positive: true },
    ],
  },
  {
    name: 'Penalties',
    icon: X,
    color: 'red',
    description: 'Ways to lose points',
    examples: [
      { text: 'Get voted out', positive: false },
      { text: 'Quit the game', positive: false },
      { text: 'Get medically evacuated', positive: false },
      { text: 'Get removed from the game', positive: false },
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
                          className="px-5 py-2.5 flex items-center gap-3 hover:bg-cream-50 transition-colors"
                        >
                          <div
                            className={`p-1 rounded-full flex-shrink-0 ${
                              example.positive ? 'bg-green-100' : 'bg-red-100'
                            }`}
                          >
                            {example.positive ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-red-600" />
                            )}
                          </div>
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
