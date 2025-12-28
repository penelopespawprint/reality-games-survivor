/**
 * Pick Countdown Banner Component
 *
 * Shows time remaining until picks lock with urgency styling.
 */

import type { Episode } from '@/types';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface PickCountdownBannerProps {
  episode: Episode;
  timeLeft: TimeLeft;
}

export function PickCountdownBanner({ episode, timeLeft }: PickCountdownBannerProps) {
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 2;

  return (
    <div
      className={`rounded-2xl p-6 text-white shadow-elevated animate-slide-up ${
        isUrgent
          ? 'bg-gradient-to-r from-orange-500 to-red-500'
          : 'bg-gradient-to-r from-burgundy-500 to-burgundy-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-sm font-medium ${isUrgent ? 'text-orange-100' : 'text-burgundy-100'}`}
          >
            {isUrgent ? 'HURRY! Picks Lock In' : 'Picks Lock In'}
          </p>
          <div className="flex items-baseline gap-2 sm:gap-3 mt-2">
            {timeLeft.days > 0 && (
              <>
                <div className="text-center">
                  <span className="text-3xl sm:text-4xl font-display">{timeLeft.days}</span>
                  <p className="text-xs text-burgundy-200 mt-1">days</p>
                </div>
                <span className="text-xl sm:text-2xl text-burgundy-200">:</span>
              </>
            )}
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-display">{timeLeft.hours}</span>
              <p className="text-xs text-burgundy-200 mt-1">hours</p>
            </div>
            <span className="text-xl sm:text-2xl text-burgundy-200">:</span>
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-display">{timeLeft.minutes}</span>
              <p className="text-xs text-burgundy-200 mt-1">min</p>
            </div>
            {isUrgent && (
              <>
                <span className="text-xl sm:text-2xl text-burgundy-200">:</span>
                <div className="text-center">
                  <span className="text-3xl sm:text-4xl font-display">{timeLeft.seconds}</span>
                  <p className="text-xs text-burgundy-200 mt-1">sec</p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm ${isUrgent ? 'text-orange-100' : 'text-burgundy-100'}`}>
            Episode airs
          </p>
          <p className="font-semibold text-lg">
            {new Date(episode.air_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
