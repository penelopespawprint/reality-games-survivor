/**
 * Phone Section Component
 *
 * Phone number management and verification.
 */

import { useState } from 'react';
import {
  Phone,
  Smartphone,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface PhoneSectionProps {
  currentPhone: string | null;
  isPhoneVerified: boolean;
  onUpdatePhone: (phone: string) => void;
  onVerifyCode: (code: string) => void;
  onResendCode: () => void;
  isUpdating: boolean;
  isVerifying: boolean;
  isResending: boolean;
  error: string | null;
  success: string | null;
  showVerification: boolean;
  onShowVerification: (show: boolean) => void;
}

export function PhoneSection({
  currentPhone,
  isPhoneVerified,
  onUpdatePhone,
  onVerifyCode,
  onResendCode,
  isUpdating,
  isVerifying,
  isResending,
  error,
  success,
  showVerification,
  onShowVerification,
}: PhoneSectionProps) {
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const handleUpdatePhone = () => {
    onUpdatePhone(phone);
    setPhone('');
  };

  const handleVerify = () => {
    onVerifyCode(verificationCode);
    setVerificationCode('');
  };

  return (
    <div
      id="phone-section"
      className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6 scroll-mt-4"
    >
      <h3 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
        <Phone className="h-5 w-5 text-burgundy-500" />
        Phone Number
      </h3>
      <p className="text-neutral-500 text-sm mb-4">
        Add your phone for SMS picks and notifications. Text PICK [name] to make picks!
      </p>

      {currentPhone && (
        <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200 mb-4">
          <Smartphone className="h-5 w-5 text-burgundy-500" />
          <div className="flex-1">
            <p className="text-neutral-800">{currentPhone}</p>
            <p className={`text-sm ${isPhoneVerified ? 'text-green-600' : 'text-orange-500'}`}>
              {isPhoneVerified ? 'Verified' : 'Not verified - enter code below'}
            </p>
          </div>
          {isPhoneVerified ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            <button
              onClick={() => onShowVerification(true)}
              className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
            >
              Verify
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 555-5555"
          className="input flex-1"
        />
        <button
          onClick={handleUpdatePhone}
          disabled={!phone || isUpdating}
          className="btn btn-primary"
        >
          {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update'}
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
          <Check className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {showVerification && (
        <div className="mt-4 p-4 bg-cream-50 rounded-xl border border-cream-200">
          <p className="text-neutral-500 text-sm mb-2">
            Enter the verification code sent to your phone:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              maxLength={6}
              className="input flex-1 text-center tracking-widest font-mono text-lg"
            />
            <button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || isVerifying}
              className="btn btn-primary"
            >
              {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
            </button>
          </div>
          <button
            onClick={onResendCode}
            disabled={isResending}
            className="mt-3 flex items-center gap-2 text-sm text-burgundy-600 hover:text-burgundy-700 disabled:opacity-50"
          >
            {isResending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Resend code
          </button>
        </div>
      )}
    </div>
  );
}
