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
        <div
          className="flex items-center justify-between cursor-pointer p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors"
          onClick={() => onEmailChange(!emailEnabled)}
        >
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-neutral-400" />
            <div>
              <p className="text-neutral-800 font-medium">Email Notifications</p>
              <p className="text-neutral-400 text-sm">Reminders, results, and updates</p>
            </div>
          </div>
          <div
            className={`w-12 h-7 rounded-full p-1 transition-colors ${emailEnabled ? 'bg-burgundy-500' : 'bg-neutral-300'}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${emailEnabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </div>
        </div>

        <div
          className={`flex items-center justify-between p-3 bg-cream-50 rounded-xl border border-cream-200 transition-colors ${phoneVerified ? 'cursor-pointer hover:bg-cream-100' : 'opacity-60 cursor-not-allowed'}`}
          onClick={() => phoneVerified && onSmsChange(!smsEnabled)}
        >
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-neutral-400" />
            <div>
              <p className="text-neutral-800 font-medium">SMS Notifications</p>
              <p className="text-neutral-400 text-sm">
                {phoneVerified ? 'Pick reminders and urgent alerts' : 'Verify phone to enable'}
              </p>
            </div>
          </div>
          <div
            className={`w-12 h-7 rounded-full p-1 transition-colors ${smsEnabled && phoneVerified ? 'bg-burgundy-500' : 'bg-neutral-300'}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${smsEnabled && phoneVerified ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </div>
        </div>

        <div
          className="flex items-center justify-between cursor-pointer p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors"
          onClick={() => onPushChange(!pushEnabled)}
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-neutral-400" />
            <div>
              <p className="text-neutral-800 font-medium">Push Notifications</p>
              <p className="text-neutral-400 text-sm">Real-time updates on your device</p>
            </div>
          </div>
          <div
            className={`w-12 h-7 rounded-full p-1 transition-colors ${pushEnabled ? 'bg-burgundy-500' : 'bg-neutral-300'}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
