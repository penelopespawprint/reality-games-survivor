/**
 * Danger Zone Component
 *
 * Delete league section.
 */

import { Trash2 } from 'lucide-react';

interface DangerZoneProps {
  onDelete: () => void;
  isPending: boolean;
}

export function DangerZone({ onDelete, isPending }: DangerZoneProps) {
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this league?')) {
      onDelete();
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <h3 className="text-red-600 font-medium mb-2 flex items-center gap-2">
        <Trash2 className="h-5 w-5" />
        Danger Zone
      </h3>
      <p className="text-red-500 text-sm mb-4">
        Deleting the league cannot be undone. All members will be removed.
      </p>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="w-full bg-red-100 hover:bg-red-200 border border-red-300 text-red-700 font-bold py-3 rounded-xl transition-colors"
      >
        {isPending ? 'Deleting...' : 'Delete League'}
      </button>
    </div>
  );
}
