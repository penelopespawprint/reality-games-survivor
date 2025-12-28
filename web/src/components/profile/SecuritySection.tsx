/**
 * Security Section Component
 *
 * Password change form.
 */

import { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';

interface SecuritySectionProps {
  onChangePassword: (password: string) => void;
  isChanging: boolean;
  error: string | null;
  success: string | null;
}

export function SecuritySection({
  onChangePassword,
  isChanging,
  error,
  success,
}: SecuritySectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    setLocalError(null);
    onChangePassword(newPassword);
  };

  const handleCancel = () => {
    setShowForm(false);
    setNewPassword('');
    setConfirmPassword('');
    setLocalError(null);
  };

  // Reset form when success
  if (success && showForm) {
    setShowForm(false);
    setNewPassword('');
    setConfirmPassword('');
  }

  const displayError = localError || error;

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
      <h3 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
        <Lock className="h-5 w-5 text-burgundy-500" />
        Security
      </h3>

      {/* Success Message */}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
          <Check className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-between p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors text-left"
        >
          <div>
            <p className="text-neutral-800 font-medium">Change Password</p>
            <p className="text-neutral-400 text-sm">Update your account password</p>
          </div>
          <Lock className="h-5 w-5 text-neutral-400" />
        </button>
      ) : (
        <div className="space-y-4">
          {/* Error Message */}
          {displayError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {displayError}
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="input w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-neutral-400 text-xs mt-1">Must be at least 8 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="input w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!newPassword || !confirmPassword || isChanging}
              className="btn btn-primary flex-1"
            >
              {isChanging ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Password'}
            </button>
            <button onClick={handleCancel} disabled={isChanging} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
