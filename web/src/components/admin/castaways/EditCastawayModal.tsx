/**
 * Edit Castaway Modal Component
 *
 * Modal for editing castaway details.
 */

import { History, Trophy } from 'lucide-react';

interface EditFormData {
  name: string;
  age: string;
  hometown: string;
  occupation: string;
  photo_url: string;
  previous_seasons: string;
  best_placement: string;
  fun_fact: string;
}

interface EditCastawayModalProps {
  formData: EditFormData;
  onFormChange: (data: EditFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function EditCastawayModal({
  formData,
  onFormChange,
  onSave,
  onCancel,
  isPending,
}: EditCastawayModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-elevated max-w-lg w-full p-6 animate-slide-up my-8">
        <h3 className="text-xl font-display text-neutral-800 mb-6">Edit Castaway</h3>

        <div className="space-y-4">
          {/* Photo URL */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Photo URL</label>
            <input
              type="url"
              value={formData.photo_url}
              onChange={(e) => onFormChange({ ...formData, photo_url: e.target.value })}
              placeholder="https://example.com/photo.jpg"
              className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
            />
            {formData.photo_url && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={formData.photo_url}
                  alt="Preview"
                  className="w-16 h-16 rounded-xl object-cover border border-cream-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-xs text-green-600">Preview</span>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
            />
          </div>

          {/* Age & Hometown */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => onFormChange({ ...formData, age: e.target.value })}
                className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Hometown</label>
              <input
                type="text"
                value={formData.hometown}
                onChange={(e) => onFormChange({ ...formData, hometown: e.target.value })}
                className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
              />
            </div>
          </div>

          {/* Occupation */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Occupation</label>
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => onFormChange({ ...formData, occupation: e.target.value })}
              className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
            />
          </div>

          {/* Returning Player Section */}
          <div className="border-t border-cream-200 pt-4 mt-4">
            <h4 className="font-medium text-neutral-800 mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-purple-500" />
              Returning Player Info
            </h4>

            {/* Previous Seasons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Previous Seasons{' '}
                <span className="text-neutral-400 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={formData.previous_seasons}
                onChange={(e) => onFormChange({ ...formData, previous_seasons: e.target.value })}
                placeholder="Heroes vs. Villains, Winners at War"
                className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
              />
            </div>

            {/* Best Placement */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Best Placement <span className="text-neutral-400 font-normal">(1 = winner)</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.best_placement}
                onChange={(e) => onFormChange({ ...formData, best_placement: e.target.value })}
                placeholder="1"
                className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500"
              />
              {formData.best_placement === '1' && (
                <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                  <Trophy className="h-3 w-3" /> Will show winner badge
                </p>
              )}
            </div>
          </div>

          {/* Fun Fact */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Fun Fact</label>
            <textarea
              value={formData.fun_fact}
              onChange={(e) => onFormChange({ ...formData, fun_fact: e.target.value })}
              placeholder="Interesting trivia about this castaway..."
              rows={3}
              className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 btn bg-cream-100 text-neutral-700 hover:bg-cream-200"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isPending || !formData.name}
            className="flex-1 btn bg-burgundy-600 text-white hover:bg-burgundy-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
