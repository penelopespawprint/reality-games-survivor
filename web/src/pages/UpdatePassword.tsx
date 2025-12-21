import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user arrived via password reset link (has recovery session)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // User should have a session from the recovery link
      setIsValidSession(!!session);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setIsSuccess(true);
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  // Invalid/expired link
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
            <h1 className="text-2xl font-display font-bold text-white mb-2">Link Expired</h1>
            <p className="text-burgundy-200 mb-6">
              This password reset link has expired or is invalid.
            </p>
            <Link
              to="/reset-password"
              className="btn btn-primary inline-block"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white mb-2">Password Updated</h1>
            <p className="text-burgundy-200 mb-6">
              Your password has been successfully updated. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-burgundy-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
          <h1 className="text-2xl font-display font-bold text-white mb-2">Set New Password</h1>
          <p className="text-burgundy-200 mb-6">
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-burgundy-200 text-sm">New Password</span>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-burgundy-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg pl-10 pr-12 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-burgundy-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-burgundy-200 text-sm">Confirm Password</span>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-burgundy-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
                  placeholder="Confirm your password"
                />
              </div>
            </label>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full bg-gold-500 hover:bg-gold-400 disabled:bg-burgundy-600 text-burgundy-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
