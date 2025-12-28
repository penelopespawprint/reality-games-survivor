/**
 * Members List Component
 *
 * Displays league members with remove capability.
 */

import { Users, Crown, UserMinus } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  users?: {
    id: string;
    display_name: string;
    email?: string;
  };
}

interface MembersListProps {
  members: Member[] | undefined;
  currentUserId: string | undefined;
  draftStatus: string | undefined;
  onRemoveMember: (userId: string, displayName: string) => void;
  isRemoving: boolean;
  removeError: boolean;
}

export function MembersList({
  members,
  currentUserId,
  draftStatus,
  onRemoveMember,
  isRemoving,
  removeError,
}: MembersListProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h3 className="text-neutral-800 font-medium mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-burgundy-500" />
        Members ({members?.length || 0})
      </h3>

      <div className="space-y-2">
        {members?.map((member) => {
          const isYou = member.user_id === currentUserId;
          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-cream-50 rounded-xl border border-cream-200"
            >
              <div className="flex items-center gap-3">
                <span className="text-neutral-800">{member.users?.display_name}</span>
                {isYou && (
                  <span className="inline-flex items-center gap-1 bg-burgundy-100 text-burgundy-600 text-xs px-2 py-0.5 rounded-full">
                    <Crown className="h-3 w-3" />
                    You
                  </span>
                )}
              </div>
              {!isYou && draftStatus === 'pending' && (
                <button
                  onClick={() =>
                    onRemoveMember(member.user_id, member.users?.display_name || 'this member')
                  }
                  disabled={isRemoving}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove member"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {removeError && <p className="text-red-500 text-sm mt-2">Failed to remove member</p>}
    </div>
  );
}
