/**
 * Award List Component
 *
 * Displays a list of award recipients with badges.
 * Used for special achievements and binary awards.
 */

import { Award, Star, Trophy, Flame, Zap } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

interface AwardRecipient {
  id: string;
  name: string;
  avatarUrl?: string;
  detail?: string;
}

interface AwardListProps {
  title: string;
  description?: string;
  recipients: AwardRecipient[];
  icon?: 'award' | 'star' | 'trophy' | 'flame' | 'zap';
  iconColor?: string;
  maxRecipients?: number;
  emptyMessage?: string;
}

const ICONS: Record<string, LucideIcon> = {
  award: Award,
  star: Star,
  trophy: Trophy,
  flame: Flame,
  zap: Zap,
};

export function AwardList({
  title,
  description,
  recipients,
  icon = 'award',
  iconColor = 'text-amber-500',
  maxRecipients = 10,
  emptyMessage = 'No recipients yet',
}: AwardListProps) {
  const IconComponent = ICONS[icon];
  const displayRecipients = recipients.slice(0, maxRecipients);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      <div className="p-4 border-b border-cream-100 bg-gradient-to-r from-amber-50 to-cream-50">
        <div className="flex items-center gap-2">
          <IconComponent className={`h-6 w-6 ${iconColor}`} />
          <h3 className="font-display font-bold text-neutral-800">{title}</h3>
        </div>
        {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
      </div>

      {displayRecipients.length === 0 ? (
        <p className="text-neutral-500 text-center py-6">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-cream-100">
          {displayRecipients.map((recipient) => (
            <div
              key={recipient.id}
              className="flex items-center gap-3 p-3 hover:bg-cream-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <IconComponent className={`h-4 w-4 ${iconColor}`} />
              </div>
              {recipient.avatarUrl ? (
                <img
                  src={recipient.avatarUrl}
                  alt={recipient.name}
                  className="w-10 h-10 rounded-full object-cover border border-cream-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-burgundy-100 flex items-center justify-center shrink-0">
                  <span className="font-bold text-burgundy-600">{recipient.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-800 truncate">{recipient.name}</p>
                {recipient.detail && <p className="text-xs text-neutral-500">{recipient.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
