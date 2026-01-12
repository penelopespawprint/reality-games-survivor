/**
 * Trivia Lockout Card Component
 *
 * Shows when user is locked out for 24 hours with live countdown.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { useQueryClient } from '@tanstack/react-query';

interface TriviaLockoutCardProps {
  lockedUntil: string;
}

export function TriviaLockoutCard({ lockedUntil }: TriviaLockoutCardProps) {
  const queryClient = useQueryClient();
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeRemaining = () => {
    const now = new Date();
    const lockout = new Date(lockedUntil);
    const diff = lockout.getTime() - now.getTime();

    if (diff <= 0) {
      setIsExpired(true);
      return null;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Update countdown every second
  useEffect(() => {
    const updateTime = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
    };

    updateTime(); // Initial calculation
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  // When countdown expires, trigger a refetch
  useEffect(() => {
    if (isExpired) {
      // Invalidate both queries to refresh the state
      queryClient.invalidateQueries({ queryKey: ['trivia', 'progress'] });
      queryClient.invalidateQueries({ queryKey: ['trivia', 'next'] });
    }
  }, [isExpired, queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['trivia', 'progress'] });
    queryClient.invalidateQueries({ queryKey: ['trivia', 'next'] });
  };

  // Show a "Try Again" button if expired
  if (isExpired) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-green-100 border-4 border-green-400 rounded-2xl p-8 mb-8 text-center shadow-lg">
        <div className="text-6xl mb-4">🔥</div>
        <h2 className="text-4xl font-display font-bold text-green-800 mb-4">You're Back!</h2>
        <p className="text-xl text-green-700 mb-6 font-semibold">Your lockout has expired. Ready to try again?</p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md text-lg"
        >
          <RefreshCw className="h-5 w-5" />
          Continue Trivia
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-red-100 border-4 border-red-400 rounded-2xl p-8 mb-8 text-center shadow-lg">
      <div className="text-6xl mb-4">💀</div>
      <h2 className="text-4xl font-display font-bold text-red-800 mb-4">It's Time For You To Go</h2>
      <p className="text-xl text-red-700 mb-2 font-semibold">The tribe has spoken.</p>
      <p className="text-lg text-red-600 mb-6">
        You got a question wrong. Come back in{' '}
        <strong className="text-2xl font-mono">{timeRemaining || 'a moment'}</strong> to continue.
      </p>
      <p className="text-sm text-red-500 mb-6">Lockout expires: {formatDate(lockedUntil)}</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-burgundy-600 text-white font-bold rounded-xl hover:bg-burgundy-700 transition-colors shadow-md text-lg"
        >
          Join a League While You Wait
          <ArrowRight className="h-5 w-5" />
        </Link>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-red-600 font-semibold rounded-xl border-2 border-red-300 hover:bg-red-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Check Status
        </button>
      </div>
    </div>
  );
}
