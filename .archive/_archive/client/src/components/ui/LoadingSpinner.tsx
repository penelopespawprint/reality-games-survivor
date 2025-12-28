/**
 * LoadingSpinner Component
 *
 * Accessible loading indicator with proper ARIA labels.
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullPage?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label = 'Loading...',
  fullPage = false,
}) => {
  const spinner = (
    <div
      role="status"
      aria-label={label}
      className="flex flex-col items-center justify-center gap-2"
    >
      <div
        className={`${sizeClasses[size]} border-gray-200 border-t-orange-500 rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
        {spinner}
        <p className="mt-4 text-gray-600">{label}</p>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
