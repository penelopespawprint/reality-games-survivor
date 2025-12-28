/**
 * Timezone Section Component
 *
 * Timezone selection for the user.
 */

import { Globe } from 'lucide-react';

interface TimezoneSectionProps {
  currentTimezone: string | null;
  onTimezoneChange: (timezone: string) => void;
}

const TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export function TimezoneSection({ currentTimezone, onTimezoneChange }: TimezoneSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
      <h3 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-burgundy-500" />
        Timezone
      </h3>
      <p className="text-neutral-500 text-sm mb-4">
        Set your timezone to see correct episode air times and pick deadlines.
      </p>
      <select
        value={currentTimezone || 'America/Los_Angeles'}
        onChange={(e) => onTimezoneChange(e.target.value)}
        className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500 bg-cream-50"
      >
        {TIMEZONE_OPTIONS.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
    </div>
  );
}
