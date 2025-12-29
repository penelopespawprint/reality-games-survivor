import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  Calendar,
  Star,
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Flame,
  MessageCircle,
  Target,
  Gem,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

// Scoring categories
const CATEGORIES = [
  {
    name: 'Survival',
    icon: Flame,
    color: 'orange',
    description: 'How to score points by staying in the game',
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
    description: 'How to score points through voting and surviving votes',
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
    description: 'How to score points in tribal immunity and reward challenges',
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
    description: 'How to score points in individual immunity and reward challenges',
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
    description: 'How to score points through big moves and game manipulation',
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
    description: 'How to score points through relationships and jury management',
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
    description: 'How to score points by finding and playing advantages',
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
    description: 'How to score points through on-screen presence and memorable moments',
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
    description: 'How to score points through special achievements and milestones',
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
    description: 'How to lose points through certain actions',
    examples: [
      { text: 'Get voted out', positive: false },
      { text: 'Quit the game', positive: false },
      { text: 'Get medically evacuated', positive: false },
      { text: 'Get removed from the game', positive: false },
    ],
  },
];

export default function HowToPlay() {
  const { user } = useAuth();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    // Start with first 3 categories expanded
    const initial: Record<string, boolean> = {};
    CATEGORIES.forEach((cat, index) => {
      initial[cat.name] = index < 3;
    });
    return initial;
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const steps = [
    {
      icon: Users,
      title: 'Join or Create a League',
      description: 'Play with friends in a private league or join a public one.',
    },
    {
      icon: Trophy,
      title: 'Draft Your Team',
      description:
        'Rank castaways before the premiere. Snake draft gives you your top 2 available picks.',
    },
    {
      icon: Calendar,
      title: 'Make Weekly Picks',
      description: 'Choose 1 of your 2 castaways each week. Picks lock Wed 3pm PST.',
    },
    {
      icon: Star,
      title: 'Earn Points',
      description: 'Score points for challenge wins, idol plays, strategic moves, and more.',
    },
    {
      icon: Award,
      title: 'Win Your League',
      description: 'Most points at the end of the season wins!',
    },
  ];

  const timeline = [
    { day: 'Wednesday 3pm', event: 'Picks lock for the week' },
    { day: 'Wednesday 8pm', event: 'Episode airs (live scoring!)' },
    { day: 'Friday 2pm', event: 'Official results posted' },
    { day: 'Saturday 12pm', event: "Next week's picks open" },
    { day: 'Wednesday 3pm', event: 'Picks lock, cycle repeats' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />

      {/* Hero Header */}
      <div className="px-6 py-8 text-center bg-gradient-to-b from-burgundy-50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="h-8 w-8 text-burgundy-500" />
            <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-800">
              How to Play
            </h1>
          </div>
          <p className="text-neutral-600 text-sm md:text-base max-w-2xl mx-auto">
            Fantasy Survivor for people who actually watch Survivor. 100+ rules. Real strategy. No
            luck required.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* How to Play Steps */}
        <section className="mb-16">
          <h2 className="text-3xl font-display font-bold text-neutral-800 mb-8 text-center">
            Getting Started
          </h2>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="bg-white rounded-2xl shadow-card p-6 md:p-8 border border-cream-200 hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-burgundy-500 rounded-full flex items-center justify-center">
                    <step.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-burgundy-500 font-bold text-sm">Step {index + 1}</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-bold text-neutral-800 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-neutral-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Weekly Timeline */}
        <section className="mb-16">
          <h2 className="text-3xl font-display font-bold text-neutral-800 mb-8 text-center">
            Weekly Timeline
          </h2>
          <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border border-cream-200">
            <div className="space-y-4">
              {timeline.map((item, index) => (
                <div key={index} className="flex items-center gap-4 md:gap-6">
                  <div className="w-32 md:w-40 text-burgundy-500 font-semibold text-sm md:text-base flex-shrink-0">
                    {item.day}
                  </div>
                  <div className="flex-1 flex items-center">
                    <div className="w-3 h-3 bg-burgundy-500 rounded-full" />
                    <div className="flex-1 h-px bg-cream-300 ml-2" />
                  </div>
                  <div className="flex-1 text-neutral-700 font-medium">{item.event}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scoring Rules Section */}
        <section id="scoring" className="mb-16 scroll-mt-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-neutral-800 mb-3">
              How to Score Points
            </h2>
            <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
              Earn and lose points based on what your castaways do each episode. Study confessional
              counts, challenge performance, and edit visibility when making your weekly picks. With
              over 100+ rules, our scoring system is unmatched.
            </p>
          </div>

          {/* Scoring Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategories[category.name];

              return (
                <div
                  key={category.name}
                  className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden hover:shadow-card-hover transition-shadow"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-cream-50 transition-colors"
                  >
                    <div
                      className={`p-2.5 rounded-xl ${
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
                                          ? 'bg-yellow-100'
                                          : 'bg-neutral-100'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
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
                                            ? 'text-yellow-700'
                                            : 'text-neutral-600'
                        }`}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-display font-bold text-neutral-800">
                        {category.name}
                      </h3>
                      <p className="text-neutral-500 text-sm">{category.description}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-neutral-400" />
                    )}
                  </button>

                  {/* Examples List */}
                  {isExpanded && (
                    <div className="border-t border-cream-200">
                      <div className="divide-y divide-cream-100">
                        {category.examples.map((example, i) => (
                          <div
                            key={i}
                            className="px-6 py-3 flex items-center gap-4 hover:bg-cream-50 transition-colors"
                          >
                            <div
                              className={`p-1.5 rounded-full flex-shrink-0 ${
                                example.positive ? 'bg-green-100' : 'bg-red-100'
                              }`}
                            >
                              {example.positive ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <p className="text-neutral-700 text-sm flex-1">{example.text}</p>
                            <span
                              className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${
                                example.positive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {example.positive ? 'Earn Points' : 'Lose Points'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border border-cream-200">
            <h3 className="font-display font-bold text-xl text-neutral-800 mb-3">
              Why don't you show exact point values?
            </h3>
            <p className="text-neutral-600">
              Our scoring system is carefully balanced to reward strategic gameplay. We keep the
              exact point values private to prevent gaming the system and to keep the competition
              fair. Focus on drafting well-rounded players who are likely to go deep in the game!
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center pb-16">
          <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-8 md:p-12 text-white shadow-lg">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
              Ready to Put Your Survivor Knowledge to the Test?
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
