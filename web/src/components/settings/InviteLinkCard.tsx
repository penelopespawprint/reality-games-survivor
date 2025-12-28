/**
 * Invite Link Card Component
 *
 * Displays league invite code with copy functionality.
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface InviteLinkCardProps {
  code: string | undefined;
}

export function InviteLinkCard({ code }: InviteLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h3 className="text-neutral-800 font-medium mb-3">Invite Link</h3>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-cream-50 rounded-xl px-4 py-3 text-burgundy-600 font-mono border border-cream-200">
          {code}
        </div>
        <button
          onClick={copyInviteLink}
          className="p-3 bg-burgundy-500 hover:bg-burgundy-600 rounded-xl transition-colors"
        >
          {copied ? (
            <Check className="h-5 w-5 text-white" />
          ) : (
            <Copy className="h-5 w-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
