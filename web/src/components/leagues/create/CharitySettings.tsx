import { useState } from 'react';
import { Heart, DollarSign } from 'lucide-react';

const DONATION_AMOUNTS = [10, 25, 50, 100];

interface CharitySettingsProps {
  requireDonation: boolean;
  setRequireDonation: (requireDonation: boolean) => void;
  donationAmount: string;
  setDonationAmount: (donationAmount: string) => void;
}

export function CharitySettings({
  requireDonation,
  setRequireDonation,
  donationAmount,
  setDonationAmount,
}: CharitySettingsProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const numericAmount = parseFloat(donationAmount) || 0;
  const isPresetAmount = DONATION_AMOUNTS.includes(numericAmount);

  const handlePresetClick = (amount: number) => {
    setShowCustomInput(false);
    setDonationAmount(amount.toString());
  };

  const handleCustomClick = () => {
    setShowCustomInput(true);
    if (isPresetAmount) {
      setDonationAmount('');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <label className="flex items-center justify-between cursor-pointer">
        <div className="flex items-center gap-3">
          <Heart className="h-5 w-5 text-burgundy-500" />
          <div>
            <p className="text-neutral-800 font-medium">Play for a Cause</p>
            <p className="text-neutral-400 text-sm">Entry fees go to charity</p>
          </div>
        </div>
        <div
          onClick={() => setRequireDonation(!requireDonation)}
          className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
            requireDonation ? 'bg-burgundy-500' : 'bg-neutral-200'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform mt-0.5 ${
              requireDonation ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'
            }`}
          />
        </div>
      </label>

      {requireDonation && (
        <div className="mt-6 pt-4 border-t border-cream-200 animate-fade-in">
          <div className="bg-gradient-to-br from-burgundy-50 to-cream-50 rounded-xl p-4 mb-4 border border-burgundy-100">
            <p className="text-neutral-700 text-sm leading-relaxed">
              <span className="font-semibold text-burgundy-600">
                The winner of your league will recommend a charity
              </span>{' '}
              of their choice for the full donation pool. Outwit, outplay, outlast — for good.
            </p>
          </div>

          <p className="text-neutral-500 text-sm mb-3 font-medium">
            Entry fee per player (minimum $10):
          </p>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {DONATION_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handlePresetClick(amount)}
                className={`py-3 px-2 rounded-xl font-bold text-base transition-all ${
                  donationAmount === amount.toString() && !showCustomInput
                    ? 'bg-burgundy-500 text-white shadow-elevated'
                    : 'bg-cream-100 text-neutral-700 hover:bg-cream-200 border border-cream-200'
                }`}
              >
                ${amount}
              </button>
            ))}
            <button
              type="button"
              onClick={handleCustomClick}
              className={`py-3 px-2 rounded-xl font-bold text-sm transition-all ${
                showCustomInput || (!isPresetAmount && donationAmount)
                  ? 'bg-burgundy-500 text-white shadow-elevated'
                  : 'bg-cream-100 text-neutral-700 hover:bg-cream-200 border border-cream-200'
              }`}
            >
              Other
            </button>
          </div>

          {/* Custom amount input */}
          {(showCustomInput || (!isPresetAmount && donationAmount)) && (
            <div className="relative mb-3">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="number"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                placeholder="Enter amount"
                min="10"
                max="10000"
                step="1"
                className="input pl-10 text-lg font-semibold"
                autoFocus
              />
            </div>
          )}

          <p className="text-neutral-400 text-xs text-center">
            100% of entry fees are donated — zero platform fees
          </p>
        </div>
      )}
    </div>
  );
}
