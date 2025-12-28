/**
 * Admin Settings Section Component
 *
 * Admin-only league name and password settings.
 */

import { Users, Lock } from 'lucide-react';

interface AdminSettingsSectionProps {
  name: string;
  password: string;
  onNameChange: (name: string) => void;
  onPasswordChange: (password: string) => void;
}

export function AdminSettingsSection({
  name,
  password,
  onNameChange,
  onPasswordChange,
}: AdminSettingsSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
        <p className="text-amber-700 text-sm font-medium">Admin-only settings</p>
      </div>

      <label className="block mb-4">
        <span className="text-neutral-800 font-medium flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-burgundy-500" />
          League Name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="input"
        />
      </label>

      <label className="block">
        <span className="text-neutral-800 font-medium flex items-center gap-2 mb-2">
          <Lock className="h-5 w-5 text-burgundy-500" />
          New Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Leave blank to keep current"
          className="input"
        />
      </label>
    </div>
  );
}
