/**
 * Floating toggle button for admin edit mode
 * Shows in bottom-right corner when admin is logged in
 */

import { Pencil, PencilOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEditMode } from '@/lib/hooks/useEditMode';

export function AdminEditToggle() {
  const { isAdmin } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();

  if (!isAdmin) return null;

  return (
    <>
      {/* Edit mode banner below nav */}
      {isEditMode && (
        <div className="fixed top-14 left-0 right-0 z-[90] bg-burgundy-600 text-white text-center py-2 text-sm font-medium shadow-lg">
          EDIT MODE ON - Click any underlined text to edit
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={toggleEditMode}
        className={`fixed bottom-24 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-full shadow-xl transition-all ${
          isEditMode
            ? 'bg-burgundy-500 text-white ring-4 ring-burgundy-300 animate-pulse'
            : 'bg-white text-neutral-700 hover:bg-cream-50 border-2 border-neutral-300'
        }`}
        title={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
      >
        {isEditMode ? (
          <>
            <PencilOff className="h-5 w-5" />
            <span className="font-medium">Exit Edit</span>
          </>
        ) : (
          <>
            <Pencil className="h-5 w-5" />
            <span className="font-medium">Edit Page</span>
          </>
        )}
      </button>
    </>
  );
}
