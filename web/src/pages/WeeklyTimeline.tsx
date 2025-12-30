import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Lock,
  Tv,
  Trophy,
  Bell,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

const TIMELINE_EVENTS = [
  {
    day: 'Wednesday',
    time: '3:00 PM PST',
    icon: Lock,
    color: 'burgundy',
    title: 'Picks Lock',
    description:
      'All weekly picks are locked in. Make sure you\'ve selected which of your 2 castaways to "play" for this episode before this deadline.',
    tip: 'Set a reminder! If you forget to pick, the system will randomly select from your available castaways.',
  },
  {
    day: 'Wednesday',
    time: '8:00 PM EST',
    icon: Tv,
    color: 'orange',
    title: 'Episode Airs',
    description:
      'Survivor airs on CBS. Watch live or avoid spoilers until you can catch up. Scoring happens in real-time as events unfold.',
    tip: 'Enable spoiler-safe mode in your settings to delay result notifications.',
  },
  {
    day: 'Thursday',
    time: 'All Day',
    icon: Trophy,
    color: 'amber',
    title: 'Scoring Review',
    description:
      'Our team reviews the episode and finalizes all scoring events. We catch every confessional, idol play, and strategic move.',
    tip: 'Scores are typically finalized within 24 hours of the episode airing.',
  },
  {
    day: 'Wed/Thu Night',
    time: 'After Airing',
    icon: Bell,
    color: 'green',
    title: 'Results Posted',
    description:
      'Usually released instantly after it airs on the west coast, but could take up to 8am the next morning to go live.',
    tip: 'Results notifications respect your spoiler delay settings.',
  },
  {
    day: 'Saturday',
    time: '12:00 PM PST',
    icon: RefreshCw,
    color: 'blue',
    title: 'Next Week Opens',
    description:
      "Picks for the next episode open. You have until Wednesday 3pm PST to decide which of your castaways to play.",
    tip: 'The earlier you pick, the less chance you forget!',
  },
];

export default function WeeklyTimeline() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navigation />

      {/* Header */}
      <div className="px-6 py-10 text-center bg-gradient-to-b from-amber-50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Calendar className="h-9 w-9 text-amber-600" />
            <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-800">
              Weekly Timeline
            </h1>
          </div>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Every week follows the same rhythm. Know the schedule, never miss a deadline, and
            maximize your scoring potential.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-3xl mx-auto px-6 pb-12">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-cream-300" />

          <div className="space-y-8">
            {TIMELINE_EVENTS.map((event, index) => {
              const Icon = event.icon;
              const bgColor =
                event.color === 'burgundy'
                  ? 'bg-burgundy-500'
                  : event.color === 'orange'
                    ? 'bg-orange-500'
                    : event.color === 'amber'
                      ? 'bg-amber-500'
                      : event.color === 'green'
                        ? 'bg-green-500'
                        : 'bg-blue-500';

              const lightBg =
                event.color === 'burgundy'
                  ? 'bg-burgundy-50 border-burgundy-200'
                  : event.color === 'orange'
                    ? 'bg-orange-50 border-orange-200'
                    : event.color === 'amber'
                      ? 'bg-amber-50 border-amber-200'
                      : event.color === 'green'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200';

              const textColor =
                event.color === 'burgundy'
                  ? 'text-burgundy-700'
                  : event.color === 'orange'
                    ? 'text-orange-700'
                    : event.color === 'amber'
                      ? 'text-amber-700'
                      : event.color === 'green'
                        ? 'text-green-700'
                        : 'text-blue-700';

              return (
                <div key={index} className="relative flex gap-6">
                  {/* Icon */}
                  <div
                    className={`relative z-10 w-16 h-16 ${bgColor} rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white rounded-2xl shadow-card border border-cream-200 p-6">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-display font-bold text-neutral-800">{event.day}</span>
                      <span className="text-neutral-400">•</span>
                      <span className="text-neutral-600 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {event.time}
                      </span>
                    </div>
                    <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">
                      {event.title}
                    </h3>
                    <p className="text-neutral-600 mb-4">{event.description}</p>
                    <div className={`${lightBg} rounded-xl p-3 border`}>
                      <p className={`text-sm ${textColor} flex items-start gap-2`}>
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{event.tip}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="max-w-3xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6">
          <h3 className="font-display font-bold text-lg text-neutral-800 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Important Notes
          </h3>
          <ul className="space-y-3 text-neutral-600">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-burgundy-500 mt-2 flex-shrink-0" />
              <span>
                <strong>All times are in Pacific Standard Time (PST)</strong> unless otherwise
                noted. The episode airs at 8pm Eastern (5pm Pacific).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-burgundy-500 mt-2 flex-shrink-0" />
              <span>
                <strong>Double episodes</strong> may have adjusted schedules. We'll notify you of
                any changes.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-burgundy-500 mt-2 flex-shrink-0" />
              <span>
                <strong>Forgot to pick?</strong> The system randomly selects from your
                available castaways.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-burgundy-500 mt-2 flex-shrink-0" />
              <span>
                <strong>Both castaways eliminated?</strong> Your torch is snuffed for the season,
                but you can still watch the leaderboard!
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-display font-bold mb-4">Never Miss a Deadline</h2>
          <p className="text-amber-100 mb-6 max-w-lg mx-auto">
            Enable notifications to get reminders before picks lock and when results are posted.
          </p>
          {user ? (
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 bg-white text-amber-600 font-bold px-8 py-3 rounded-xl hover:bg-cream-100 transition-colors"
            >
              Manage Notifications
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-white text-amber-600 font-bold px-8 py-3 rounded-xl hover:bg-cream-100 transition-colors"
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
