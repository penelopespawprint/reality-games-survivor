/**
 * Transfer Ownership Section Component
 *
 * Transfer ownership card and modal.
 */

import { useState } from 'react';
import { ArrowRightLeft, AlertTriangle, X, Loader2 } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  users?: {
    id: string;
    display_name: string;
  };
}

interface TransferOwnershipSectionProps {
  otherMembers: Member[];
  onTransfer: (newOwnerId: string) => void;
  isPending: boolean;
  isError: boolean;
}

export function TransferOwnershipSection({
  otherMembers,
  onTransfer,
  isPending,
  isError,
}: TransferOwnershipSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);

  if (otherMembers.length === 0) {
    return null;
  }

  const handleTransfer = () => {
    if (targetId && confirm('Are you sure? You will lose creator privileges.')) {
      onTransfer(targetId);
    }
  };

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="text-amber-700 font-medium mb-2 flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Transfer Ownership
        </h3>
        <p className="text-amber-600 text-sm mb-4">
          Transfer ownership to another member. You will lose all creator privileges.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 font-bold py-3 rounded-xl transition-colors"
        >
          Transfer Ownership
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-cream-200 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-neutral-800 font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Transfer Ownership
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setTargetId(null);
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-neutral-500 text-sm mb-4">
              Select a member to become the new league creator. This action cannot be undone.
            </p>

            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {otherMembers.map((member) => (
                <label
                  key={member.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    targetId === member.user_id
                      ? 'bg-burgundy-50 border-2 border-burgundy-500'
                      : 'bg-cream-50 border border-cream-200 hover:bg-cream-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="transfer-target"
                    value={member.user_id}
                    checked={targetId === member.user_id}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="text-burgundy-500 focus:ring-burgundy-500"
                  />
                  <span className="text-neutral-800">{member.users?.display_name}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setTargetId(null);
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!targetId || isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-cream-200 text-white disabled:text-neutral-400 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Transfer'}
              </button>
            </div>

            {isError && (
              <p className="text-red-500 text-sm mt-3 text-center">Failed to transfer ownership</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
