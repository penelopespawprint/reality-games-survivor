import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function Signup() {
  const { signInWithGoogle, signInWithMagicLink } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setError('');
    setMagicLinkLoading(true);
    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setMagicLinkLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cream-100 to-cream-200 px-4 py-12">
      {/* Card with elevated shadow */}
      <div className="bg-white rounded-2xl shadow-float max-w-md w-full p-8 animate-slide-up">
        {/* Logo - Double size */}
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img src="/logo.png" alt="RGFL" className="h-24 w-auto" />
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-neutral-800">Sign up</h1>
          <p className="text-neutral-500 mt-2">Free and only takes a minute</p>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-4 mb-6">
            <p className="text-error-600 text-sm">{error}</p>
          </div>
        )}

        {/* OAuth Only - Profile questions happen after registration */}
        <div className="space-y-4">
          <p className="text-neutral-600 text-center">
            Sign up with your Google account. Profile questions will be asked after registration.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="btn btn-secondary w-full flex items-center justify-center gap-3 shadow-card hover:shadow-card-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-neutral-400">OR</span>
            </div>
          </div>

          {/* Magic Link Toggle/Form */}
          {!showMagicLink && !magicLinkSent && (
            <button
              type="button"
              onClick={() => setShowMagicLink(true)}
              className="btn btn-secondary w-full flex items-center justify-center gap-3 shadow-card hover:shadow-card-hover transition-all"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Sign up with Email (Magic Link)
            </button>
          )}

          {showMagicLink && !magicLinkSent && (
            <div className="space-y-3 animate-slide-up">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input w-full"
                disabled={magicLinkLoading}
              />
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={!email || magicLinkLoading}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {magicLinkLoading ? 'Sending...' : 'Send Magic Link'}
              </button>
              <button
                type="button"
                onClick={() => setShowMagicLink(false)}
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                ← Back to Google Sign Up
              </button>
            </div>
          )}

          {magicLinkSent && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-700 text-sm text-center">
                ✉️ Check your email! We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-green-600 text-xs text-center mt-2">
                Click the link to complete signup (check spam if you don't see it)
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-neutral-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-burgundy-500 hover:text-burgundy-600 font-semibold">
              Login
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
