/**
 * Notifications Section Component
 *
 * Notification preference toggles.
 */

import { Bell, Mail, Smartphone } from 'lucide-react';

interface NotificationsSectionProps {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  phoneVerified: boolean;
  onEmailChange: (enabled: boolean) => void;
  onSmsChange: (enabled: boolean) => void;
  onPushChange: (enabled: boolean) => void;
}

export function NotificationsSection({
  emailEnabled,
  smsEnabled,
  pushEnabled,
  phoneVerified,
  onEmailChange,
  onSmsChange,
  onPushChange,
}: NotificationsSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
      <h3 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
        <Bell className="h-5 w-5 text-burgundy-500" />
        Notifications
      </h3>

      <div className="space-y-4">
        <label className="flex items-center justify-between cursor-pointer p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-neutral-400" />
            <div>
              <p className="text-neutral-800 font-medium">Email Notifications</p>
              <p className="text-neutral-400 text-sm">Reminders, results, and updates</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => onEmailChange(e.target.checked)}
            className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-neutral-400" />
            <div>
              <p className="text-neutral-800 font-medium">SMS Notifications</p>
              <p className="text-neutral-400 text-sm">Pick reminders and urgent alerts</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={smsEnabled}
            onChange={(e) => onSmsChange(e.target.checked)}
            disabled={!phoneVerified}
            className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500 disabled:opacity-50"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-neutral-400" />
            <div>
              <p className="text-neutral-800 font-medium">Push Notifications</p>
              <p className="text-neutral-400 text-sm">Real-time updates on your device</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={(e) => onPushChange(e.target.checked)}
            className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
          />
        </label>
      </div>
    </div>
  );
}
