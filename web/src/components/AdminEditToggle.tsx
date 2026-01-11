/**
 * Floating toggle button for admin edit mode
 * Shows in bottom-left corner when admin is logged in
 */

import { Pencil, PencilOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEditMode } from '@/lib/hooks/useEditMode';

export function AdminEditToggle() {
  const { isAdmin } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();

  if (!isAdmin) return null;

  return (
    <button
      onClick={toggleEditMode}
      className={`fixed bottom-20 left-4 z-50 p-3 rounded-full shadow-lg transition-all ${
        isEditMode
          ? 'bg-burgundy-500 text-white ring-2 ring-burgundy-300'
          : 'bg-white text-neutral-600 hover:bg-cream-50 border border-cream-200'
      }`}
      title={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
    >
      {isEditMode ? (
        <PencilOff className="h-5 w-5" />
      ) : (
        <Pencil className="h-5 w-5" />
      )}
    </button>
  );
}
