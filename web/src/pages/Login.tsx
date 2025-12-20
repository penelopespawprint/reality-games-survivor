import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('magic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'magic') {
        await signInWithMagicLink(email);
        setMagicLinkSent(true);
      } else {
        await signIn(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-jungle-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✉️</span>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Check your email</h2>
          <p className="text-neutral-400 mb-6">
            We sent a magic link to <span className="text-white">{email}</span>
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-tribal-500 hover:text-tribal-400 text-sm"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="font-display text-4xl text-tribal-500">RGFL</span>
          </Link>
          <h1 className="text-2xl font-semibold text-white mt-4">Welcome back</h1>
          <p className="text-neutral-400 mt-2">Sign in to continue to your leagues</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
            />
          </div>

          {mode === 'password' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : mode === 'magic' ? 'Send Magic Link' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'magic' ? 'password' : 'magic')}
            className="text-sm text-neutral-400 hover:text-white"
          >
            {mode === 'magic' ? 'Use password instead' : 'Use magic link instead'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
          <p className="text-neutral-400 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-tribal-500 hover:text-tribal-400">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
