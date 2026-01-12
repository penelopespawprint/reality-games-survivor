/**
 * Admin Reorder Controls Component
 *
 * Shows up/down arrows and delete button for reorderable items.
 * Only visible to admins when edit mode is on.
 */

import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEditMode } from '@/lib/hooks/useEditMode';

interface AdminReorderControlsProps {
  index: number;
  totalItems: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  className?: string;
}

export function AdminReorderControls({
  index,
  totalItems,
  onMoveUp,
  onMoveDown,
  onDelete,
  showDelete = false,
  className = '',
}: AdminReorderControlsProps) {
  const { isAdmin } = useAuth();
  const { isEditMode } = useEditMode();

  if (!isAdmin || !isEditMode) {
    return null;
  }

  const isFirst = index === 0;
  const isLast = index === totalItems - 1;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMoveUp();
        }}
        disabled={isFirst}
        className={`p-1.5 rounded transition-all ${
          isFirst
            ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
            : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-600'
        }`}
        title="Move Up"
      >
        <ChevronUp className="h-3 w-3" />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMoveDown();
        }}
        disabled={isLast}
        className={`p-1.5 rounded transition-all ${
          isLast
            ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
            : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-600'
        }`}
        title="Move Down"
      >
        <ChevronDown className="h-3 w-3" />
      </button>
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-all"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
