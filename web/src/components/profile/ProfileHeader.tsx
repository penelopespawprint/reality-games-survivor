/**
 * Profile Header Component
 *
 * User avatar, display name editing, and email display.
 */

import { useState } from 'react';
import { User, Mail, Pencil, Loader2, Check, AlertCircle } from 'lucide-react';

interface ProfileHeaderProps {
  displayName: string | null;
  email: string | null;
  onUpdateName: (name: string) => void;
  isUpdating: boolean;
  error: string | null;
  success: string | null;
}

export function ProfileHeader({
  displayName,
  email,
  onUpdateName,
  isUpdating,
  error,
  success,
}: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const handleSave = () => {
    if (editName.trim()) {
      onUpdateName(editName.trim());
      setIsEditing(false);
      setEditName('');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName('');
  };

  const handleStartEdit = () => {
    setEditName(displayName || '');
    setIsEditing(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-burgundy-500 rounded-full flex items-center justify-center">
          <User className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1">
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter display name"
                className="input flex-1"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={!editName.trim() || isUpdating}
                className="btn btn-primary"
              >
                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
              </button>
              <button onClick={handleCancel} className="btn btn-secondary" disabled={isUpdating}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-neutral-800">{displayName}</h2>
              <button
                onClick={handleStartEdit}
                className="p-1 text-neutral-400 hover:text-burgundy-500 transition-colors"
                title="Edit display name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="text-neutral-500">{email}</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
          <Check className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Email display */}
      <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200">
        <Mail className="h-5 w-5 text-burgundy-500" />
        <div className="flex-1">
          <p className="text-neutral-800">{email}</p>
          <p className="text-neutral-400 text-sm">Primary email</p>
        </div>
        <Check className="h-5 w-5 text-green-500" />
      </div>
    </div>
  );
}
