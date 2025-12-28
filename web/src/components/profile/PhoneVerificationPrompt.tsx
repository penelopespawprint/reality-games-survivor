/**
 * Phone Verification Prompt Component
 *
 * Amber banner prompting users to verify their phone.
 */

import { Smartphone, Phone } from 'lucide-react';

export function PhoneVerificationPrompt() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-full">
          <Smartphone className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-amber-800">Add Your Phone Number</h3>
          <p className="text-sm text-amber-700 mt-1">
            Verify your phone to receive SMS pick reminders and use text commands like "PICK
            Boston Rob" to submit picks on the go!
          </p>
          <a
            href="#phone-section"
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 mt-2"
          >
            <Phone className="h-4 w-4" />
            Set up phone below
          </a>
        </div>
      </div>
    </div>
  );
}
