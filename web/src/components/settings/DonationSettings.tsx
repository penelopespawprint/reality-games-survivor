/**
 * Donation Settings Component
 *
 * League donation toggle and amount settings.
 */

import { DollarSign } from 'lucide-react';

interface DonationSettingsProps {
  requireDonation: boolean;
  donationAmount: string;
  draftStatus: string | undefined;
  onRequireDonationChange: (require: boolean) => void;
  onDonationAmountChange: (amount: string) => void;
}

export function DonationSettings({
  requireDonation,
  donationAmount,
  draftStatus,
  onRequireDonationChange,
  onDonationAmountChange,
}: DonationSettingsProps) {
  const canModify = draftStatus === 'pending';

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <label className="flex items-center justify-between cursor-pointer mb-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-burgundy-500" />
          <span className="text-neutral-800 font-medium">Require Donation</span>
        </div>
        <input
          type="checkbox"
          checked={requireDonation}
          onChange={(e) => onRequireDonationChange(e.target.checked)}
          disabled={!canModify}
          className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500 disabled:opacity-50"
        />
      </label>

      {requireDonation && (
        <div className="space-y-4 pt-4 border-t border-cream-200">
          <label className="block">
            <span className="text-neutral-500 text-sm mb-2 block">Amount ($)</span>
            <input
              type="number"
              value={donationAmount}
              onChange={(e) => onDonationAmountChange(e.target.value)}
              disabled={!canModify}
              className="input disabled:opacity-50"
            />
          </label>
        </div>
      )}
    </div>
  );
}
